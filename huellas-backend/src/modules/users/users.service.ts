import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create.users.dto';
import { Role } from '../roles/roles.entity';
import { AdminCreateUserDto } from './dto/admin.create.users.dto';
import { Auth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../../common/firebase/firebase-admin.constants';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { Articulo } from '../articulos/entities/articulo.entity';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { Observacion } from '../observaciones/entities/observacione.entity';
import { UsersListQueryDto } from './dto/users-list.query.dto';
import { Revisores } from '../revisores/entities/revisores.entity';

export interface UsersListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  activeUsers: number;
  pendingUsers: number;
  roleUsersCount: number;
}

export interface UsersListResponse {
  items: User[];
  meta: UsersListMeta;
}

interface FirebaseAdminError {
  code?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private static readonly ARTICULO_ETAPAS_TERMINALES = [5, 7];

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
    @InjectRepository(Observacion)
    private readonly observacionRepository: Repository<Observacion>,
    @InjectRepository(ArticuloHistorialEtapa)
    private readonly historialEtapaRepository: Repository<ArticuloHistorialEtapa>,
    @InjectRepository(Revisores)
    private readonly revisoresRepository: Repository<Revisores>,
    @Inject(FIREBASE_AUTH) private readonly firebaseAuth: Auth,
    private readonly configService: ConfigService,
  ) {}

  async createWithAdmin(adminCreateDto: AdminCreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(adminCreateDto.correo);
    if (existingUser) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const role = await this.rolesRepository.findOne({
      where: { id: adminCreateDto.rolId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const firebaseUid = await this.createFirebaseUserAndSendVerification(
      adminCreateDto.correo,
      adminCreateDto.contraseña,
    );

    try {
      const newUser = this.userRepository.create({
        nombre: adminCreateDto.nombre,
        correo: adminCreateDto.correo,
        telefono: adminCreateDto.telefono ?? '',
      });

      newUser.roles = [role];
      const savedUser = await this.userRepository.save(newUser);
      return savedUser;
    } catch {
      await this.deleteFirebaseUserSilently(firebaseUid);
      throw new InternalServerErrorException(
        'No fue posible guardar el usuario en la base de datos.',
      );
    }
  }

  private async createFirebaseUserAndSendVerification(
    correo: string,
    contraseña: string,
  ): Promise<string> {
    let firebaseUid: string | null = null;

    try {
      const firebaseUser = await this.firebaseAuth.createUser({
        email: correo,
        password: contraseña,
        emailVerified: false,
      });

      firebaseUid = firebaseUser.uid;

      await this.sendVerificationEmail(correo, true);

      return firebaseUser.uid;
    } catch (error) {
      if (firebaseUid) {
        await this.deleteFirebaseUserSilently(firebaseUid);
      }

      if (this.isFirebaseAuthError(error, 'auth/email-already-exists')) {
        throw new BadRequestException(
          'El correo ya está registrado en Firebase.',
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'No fue posible crear el usuario en Firebase.',
      );
    }
  }

  async resendVerificationEmail(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { existsInFirebase, emailVerified } =
      await this.syncVerificationStatusFromFirebase(user);

    if (!existsInFirebase) {
      throw new BadRequestException(
        'El usuario no existe en Firebase. Usa la acción "Restablecer acceso" para recrearlo y enviar recuperación.',
      );
    }

    const isVerified = existsInFirebase ? emailVerified : false;

    if (isVerified) {
      throw new BadRequestException(
        'El correo del usuario ya está verificado.',
      );
    }

    await this.sendVerificationEmail(user.correo, true);
  }

  async restoreFirebaseAccess(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { existsInFirebase } =
      await this.syncVerificationStatusFromFirebase(user);

    if (!existsInFirebase) {
      await this.createFirebaseUserForRecovery(user.correo, user.estado_cuenta);
    } else {
      await this.syncFirebaseAccountStatus(user.correo, user.estado_cuenta);
    }

    user.correo_verificado = false;
    await this.userRepository.save(user);

    await this.sendPasswordResetEmail(user.correo, true);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que el usuario no esté activo
    if (user.estado_cuenta === true) {
      throw new ConflictException(
        'No se puede eliminar este usuario porque la cuenta está activa. Primero debe desactivar la cuenta.',
      );
    }

    // Validar que no tenga acciones pendientes
    const validationResult = await this.validateUserDeletion(id);

    if (!validationResult.canDelete) {
      throw new ConflictException(validationResult.reason);
    }

    await this.deleteFirebaseUserByEmail(user.correo);

    await this.userRepository.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from('articulo_autores')
        .where('usuario_id = :id', { id })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from('rol_usuarios')
        .where('usuario_id = :id', { id })
        .execute();

      await manager
        .createQueryBuilder()
        .update(Observacion)
        .set({ usuarioId: () => 'NULL' })
        .where('usuario_id = :id', { id })
        .execute();

      await manager
        .createQueryBuilder()
        .update(ArticuloHistorialEtapa)
        .set({ usuarioId: () => 'NULL' })
        .where('usuario_id = :id', { id })
        .execute();

      await manager
        .createQueryBuilder()
        .update(Articulo)
        .set({ comiteEditorialId: () => 'NULL' })
        .where('comite_editorial_id = :id', { id })
        .execute();

      await manager.getRepository(User).delete(id);
    });
  }

  private async validateUserDeletion(
    userId: number,
  ): Promise<{ canDelete: boolean; reason: string }> {
    const terminalStages = UsersService.ARTICULO_ETAPAS_TERMINALES;

    // Validar artículos como autor en etapas no terminales
    const articulosComoAutor = await this.articuloRepository
      .createQueryBuilder('articulo')
      .innerJoin('articulo.autores', 'autor', 'autor.id = :userId', { userId })
      .where('articulo.etapaActualId NOT IN (:...terminalStages)', {
        terminalStages,
      })
      .getCount();

    if (articulosComoAutor > 0) {
      return {
        canDelete: false,
        reason: `No se puede eliminar este usuario porque tiene ${articulosComoAutor} artículo(s) activo(s) como autor en proceso de evaluación.`,
      };
    }

    // Validar artículos como comité editorial en etapas no terminales
    const articulosComoComite = await this.articuloRepository
      .createQueryBuilder('articulo')
      .where('articulo.comiteEditorialId = :userId', { userId })
      .andWhere('articulo.etapaActualId NOT IN (:...terminalStages)', {
        terminalStages,
      })
      .getCount();

    if (articulosComoComite > 0) {
      return {
        canDelete: false,
        reason: `No se puede eliminar este usuario porque tiene ${articulosComoComite} artículo(s) asignado(s) en el comité editorial que aún está(n) en proceso.`,
      };
    }

    // Validar observaciones pendientes
    const observacionesPendientes = await this.observacionRepository
      .createQueryBuilder('observacion')
      .innerJoin('observacion.articulo', 'articulo')
      .where('observacion.usuarioId = :userId', { userId })
      .andWhere('articulo.etapaActualId NOT IN (:...terminalStages)', {
        terminalStages,
      })
      .getCount();

    if (observacionesPendientes > 0) {
      return {
        canDelete: false,
        reason: `No se puede eliminar este usuario porque tiene ${observacionesPendientes} observación(es) activa(s) en artículos en proceso.`,
      };
    }

    // Validar historial de etapas pendientes
    const historialPendiente = await this.historialEtapaRepository
      .createQueryBuilder('historial')
      .innerJoin('historial.articulo', 'articulo')
      .where('historial.usuarioId = :userId', { userId })
      .andWhere('articulo.etapaActualId NOT IN (:...terminalStages)', {
        terminalStages,
      })
      .getCount();

    if (historialPendiente > 0) {
      return {
        canDelete: false,
        reason: `No se puede eliminar este usuario porque hay acciones pendientes vinculadas a artículos en proceso.`,
      };
    }

    return { canDelete: true, reason: '' };
  }

  private async hasPendingArticleWork(userId: number): Promise<boolean> {
    const validationResult = await this.validateUserDeletion(userId);
    return !validationResult.canDelete;
  }

  private async sendVerificationEmail(
    correo: string,
    strictSmtp: boolean,
  ): Promise<void> {
    const verificationLink =
      await this.firebaseAuth.generateEmailVerificationLink(correo);

    this.logger.log(
      `[SMTP-DEBUG] Enlace de verificación para ${correo}: ${verificationLink}`,
    );

    const sentBySmtp = await this.sendVerificationEmailBySmtp(
      correo,
      verificationLink,
    );

    if (sentBySmtp) {
      return;
    }

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    if (strictSmtp && isProduction) {
      throw new InternalServerErrorException(
        'No fue posible enviar el correo de verificación. Verifica la configuración SMTP.',
      );
    } else if (!isProduction) {
      this.logger.warn(
        `[SMTP-WARNING] No se pudo enviar el correo de verificación a ${correo} por SMTP, pero se omitió el error por estar en desarrollo. Enlace: ${verificationLink}`,
      );
    }
  }

  private async sendPasswordResetEmail(
    correo: string,
    strictSmtp: boolean,
  ): Promise<void> {
    const resetLink = await this.firebaseAuth.generatePasswordResetLink(correo);

    this.logger.log(
      `[SMTP-DEBUG] Enlace de restablecimiento de contraseña para ${correo}: ${resetLink}`,
    );

    const sentBySmtp = await this.sendPasswordResetEmailBySmtp(
      correo,
      resetLink,
    );

    if (sentBySmtp) {
      return;
    }

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    if (strictSmtp && isProduction) {
      throw new InternalServerErrorException(
        'No fue posible enviar el correo para restablecer el acceso. Verifica la configuración SMTP.',
      );
    } else if (!isProduction) {
      this.logger.warn(
        `[SMTP-WARNING] No se pudo enviar el correo de restablecimiento de contraseña a ${correo} por SMTP, pero se omitió el error por estar en desarrollo. Enlace: ${resetLink}`,
      );
    }
  }

  private getSmtpConfig(): SmtpConfig | null {
    const host =
      this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const portRaw =
      this.configService.get<string>('SMTP_PORT') || process.env.SMTP_PORT;
    const secureRaw =
      this.configService.get<string>('SMTP_SECURE') || process.env.SMTP_SECURE;
    const user =
      this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass =
      this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS;
    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      process.env.SMTP_FROM_EMAIL;
    const fromName =
      this.configService.get<string>('SMTP_FROM_NAME') ||
      process.env.SMTP_FROM_NAME ||
      'Revista Huellas';

    if (!host || !portRaw || !fromEmail) {
      return null;
    }

    const port = Number(portRaw);

    if (Number.isNaN(port)) {
      return null;
    }

    return {
      host,
      port,
      secure: secureRaw === 'true',
      user,
      pass,
      fromEmail,
      fromName,
    };
  }

  private async sendVerificationEmailBySmtp(
    correo: string,
    verificationLink: string,
  ): Promise<boolean> {
    const smtpConfig = this.getSmtpConfig();

    if (!smtpConfig) {
      return false;
    }

    try {
      const transport = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth:
          smtpConfig.user && smtpConfig.pass
            ? {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
              }
            : undefined,
      });

      await transport.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: correo,
        subject: 'Verifica tu nuevo correo electrónico',
        html: `
          <p>Hola,</p>
          <p>Tu correo fue actualizado en Huellas.</p>
          <p>Para verificar el nuevo correo, haz clic en el siguiente enlace:</p>
          <p><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">Verificar correo</a></p>
          <p>Si no solicitaste este cambio, contacta al administrador.</p>
        `,
      });

      return true;
    } catch {
      return false;
    }
  }

  private async sendPasswordResetEmailBySmtp(
    correo: string,
    resetLink: string,
  ): Promise<boolean> {
    const smtpConfig = this.getSmtpConfig();

    if (!smtpConfig) {
      return false;
    }

    try {
      const transport = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth:
          smtpConfig.user && smtpConfig.pass
            ? {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
              }
            : undefined,
      });

      await transport.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: correo,
        subject: 'Restablece tu acceso a Huellas',
        html: `
          <p>Hola,</p>
          <p>Tu acceso fue restablecido por un administrador.</p>
          <p>Para definir una nueva contraseña, haz clic en el siguiente enlace:</p>
          <p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">Restablecer contraseña</a></p>
          <p>Si no solicitaste este cambio, contacta al administrador.</p>
        `,
      });

      return true;
    } catch {
      return false;
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = this.userRepository.create(createUserDto);
    const defaultRole = await this.rolesRepository.findOne({
      where: { rol: 'autor' },
    });
    if (defaultRole) {
      newUser.roles = [defaultRole];
    }
    return this.userRepository.save(newUser);
  }

  async findByEmail(correo: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { correo },
      relations: ['roles'],
    });
  }

  async findAll(query: UsersListQueryDto): Promise<UsersListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const search = (query.search ?? '').trim().toLowerCase();

    const baseQuery = this.userRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.roles', 'rol')
      .orderBy('usuario.nombre', 'ASC')
      .addOrderBy('usuario.id', 'ASC');

    if (search) {
      baseQuery.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(usuario.nombre) LIKE :search', {
            search: `%${search}%`,
          })
            .orWhere('LOWER(usuario.correo) LIKE :search', {
              search: `%${search}%`,
            })
            .orWhere("LOWER(COALESCE(usuario.telefono, '')) LIKE :search", {
              search: `%${search}%`,
            })
            .orWhere('LOWER(rol.rol) LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    const [items, total] = await baseQuery
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const [activeUsers, pendingUsers, roleUsersCount] = await Promise.all([
      this.userRepository.count({ where: { estado_cuenta: true } }),
      this.userRepository.count({ where: { correo_verificado: false } }),
      this.userRepository
        .createQueryBuilder('usuario')
        .distinct(true)
        .innerJoin('usuario.roles', 'rol')
        .where('LOWER(rol.rol) IN (:...roles)', {
          roles: ['comite-editorial', 'admin', 'director', 'monitor'],
        })
        .getCount(),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        activeUsers,
        pendingUsers,
        roleUsersCount,
      },
    };
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async findPerfilByUsuarioId(usuarioId: number) {
    const [user, revisor] = await Promise.all([
      this.userRepository.findOne({ where: { id: usuarioId } }),
      this.revisoresRepository.findOne({
        where: { usuarioId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user.id,
      nombre: user.nombre ?? '',
      telefono: user.telefono ?? '',
      correo: user.correo ?? '',
      perfilAcademico: revisor?.perfil ?? '',
      institucion: revisor?.institucion ?? '',
    };
  }

  async updatePerfilByUsuarioId(
    usuarioId: number,
    data: {
      nombre?: string;
      telefono?: string;
      perfilAcademico?: string;
      institucion?: string;
    },
  ) {
    const [user, revisor] = await Promise.all([
      this.userRepository.findOne({
        where: { id: usuarioId },
        relations: ['roles'],
      }),
      this.revisoresRepository.findOne({ where: { usuarioId } }),
    ]);

    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Actualizar nombre y teléfono
    if (typeof data.nombre === 'string') user.nombre = data.nombre;
    if (typeof data.telefono === 'string') user.telefono = data.telefono;

    // Ya no hay cambio de correo

    // Actualizar revisor si es el caso
    const esRevisor = this.hasRoleName(user.roles, 'revisor');
    const tieneCamposRevisor =
      typeof data.perfilAcademico === 'string' ||
      typeof data.institucion === 'string';
    if (esRevisor && tieneCamposRevisor) {
      const revisorActual =
        revisor ??
        this.revisoresRepository.create({
          usuarioId,
          perfil: '',
          cargaActual: 0,
          institucion: '',
        });
      if (typeof data.perfilAcademico === 'string')
        revisorActual.perfil = data.perfilAcademico;
      if (typeof data.institucion === 'string')
        revisorActual.institucion = data.institucion;
      await this.revisoresRepository.save(revisorActual);
    }

    await this.userRepository.save(user);

    // Retornar datos actualizados
    const perfilRevisor = await this.revisoresRepository.findOne({
      where: { usuarioId },
    });
    return {
      id: user.id,
      nombre: user.nombre ?? '',
      telefono: user.telefono ?? '',
      correo: user.correo ?? '', // se sigue devolviendo pero no se usa para edición
      perfilAcademico: perfilRevisor?.perfil ?? '',
      institucion: perfilRevisor?.institucion ?? '',
    };
  }

  async findAvailableRoles(): Promise<Role[]> {
    return this.rolesRepository.find({ order: { id: 'ASC' } });
  }

  async findCommitteeMembers(): Promise<any[]> {
    const users = await this.userRepository.find({ relations: ['roles'] });

    const filtered = users.filter(
      (user) =>
        user.estado_cuenta === true &&
        user.roles?.some((role) => role.rol === 'comite-editorial'),
    );

    return Promise.all(
      filtered.map(async (user) => {
        const count = await this.articuloRepository.count({
          where: {
            comiteEditorialId: user.id,
            etapaActualId: 6,
          } as any,
        });

        return {
          ...user,
          articulosAsignados: count,
        };
      }),
    );
  }

  async findAutores(): Promise<Partial<User>[]> {
    return this.userRepository
      .createQueryBuilder('usuario')
      .innerJoin('usuario.roles', 'rol')
      .where('rol.rol = :nombreRol', { nombreRol: 'autor' })
      .andWhere('usuario.estado_cuenta = :activo', { activo: true })
      .select(['usuario.id', 'usuario.nombre', 'usuario.correo'])
      .orderBy('usuario.nombre', 'ASC')
      .getMany();
  }

  async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const hadRevisorRole = this.hasRoleName(user.roles, 'revisor');
    const nextRoles = Array.isArray(data.roles)
      ? data.roles
      : (user.roles ?? []);
    const hasRevisorRole = await this.rolesContain(nextRoles, 'revisor');

    const correoActual = user.correo.trim().toLowerCase();
    const correoNuevo =
      typeof data.correo === 'string'
        ? data.correo.trim().toLowerCase()
        : correoActual;
    const correoCambiado = correoNuevo !== correoActual;
    const requiresFirebaseSync =
      correoCambiado || typeof data.estado_cuenta === 'boolean';

    if (requiresFirebaseSync) {
      const { existsInFirebase } =
        await this.syncVerificationStatusFromFirebase(user);

      if (!existsInFirebase) {
        throw new BadRequestException(
          'El usuario no existe en Firebase. Usa la acción "Restablecer acceso" antes de actualizar correo o estado de cuenta.',
        );
      }
    }

    if (correoCambiado) {
      if (!correoNuevo) {
        throw new BadRequestException('El correo no puede estar vacío.');
      }

      const correoEnUso = await this.userRepository.findOne({
        where: { correo: correoNuevo },
      });

      if (correoEnUso && correoEnUso.id !== id) {
        throw new BadRequestException('El nuevo correo ya está registrado.');
      }

      await this.syncFirebaseUserEmail(correoActual, correoNuevo);

      data.correo = correoNuevo;
      data.correo_verificado = false;
    }

    if (typeof data.estado_cuenta === 'boolean') {
      const correo = correoCambiado ? correoNuevo : correoActual;
      await this.syncFirebaseAccountStatus(correo, data.estado_cuenta);
    }

    if (correoCambiado) {
      await this.sendVerificationEmail(correoNuevo, true);
    }

    Object.assign(user, data);
    const savedUser = await this.userRepository.save(user);

    if (!hadRevisorRole && hasRevisorRole) {
      await this.ensureRevisorExists(savedUser.id);
    }

    // Sincronizar roles con Firebase Custom Claims si se modificaron
    if (data.roles) {
      try {
        const firebaseUser = await this.firebaseAuth.getUserByEmail(
          savedUser.correo,
        );
        const roleNames: string[] = savedUser.roles?.map((r) => r.rol) ?? [];

        const editorialManagers = [
          'admin',
          'director',
          'monitor',
          'comite-editorial',
        ];
        const userManagers = ['admin', 'director', 'monitor'];

        const canViewArchivos = roleNames.some((rol) =>
          [...editorialManagers, 'revisor'].includes(rol),
        );

        const canSubmitEnvios = roleNames.some((rol) =>
          ['admin', 'autor'].includes(rol),
        );

        const canManageUsers = roleNames.some((rol) =>
          userManagers.includes(rol),
        );
        const canManageArticulos = roleNames.some((rol) =>
          editorialManagers.includes(rol),
        );
        const canManageFlujoEditorial = roleNames.some((rol) =>
          editorialManagers.includes(rol),
        );

        const customClaims = {
          roles: roleNames,
          canViewArchivos,
          canSubmitEnvios,
          canManageUsers,
          canManageArticulos,
          canManageFlujoEditorial,
          externalSystemUid: `huellas-db-${savedUser.id}`,
        };

        await this.firebaseAuth.setCustomUserClaims(
          firebaseUser.uid,
          customClaims,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudieron actualizar claims en Firebase para ${savedUser.correo}: ${
            error instanceof Error ? error.message : 'error desconocido'
          }`,
        );
      }
    }

    return savedUser;
  }

  private hasRoleName(roles: Role[] | undefined, roleName: string): boolean {
    const normalized = roleName.trim().toLowerCase();
    return (roles ?? []).some(
      (role) => (role?.rol ?? '').trim().toLowerCase() === normalized,
    );
  }

  private async rolesContain(
    roles: Array<Partial<Role>>,
    roleName: string,
  ): Promise<boolean> {
    const normalized = roleName.trim().toLowerCase();
    const names = await this.resolveRoleNames(roles);
    return names.includes(normalized);
  }

  private async resolveRoleNames(
    roles: Array<Partial<Role>>,
  ): Promise<string[]> {
    const normalized = roles
      .map((role) => (role?.rol ?? '').trim().toLowerCase())
      .filter((name) => name.length > 0);

    const missingIds = roles
      .filter((role) => !role?.rol && typeof role?.id === 'number')
      .map((role) => role.id as number);

    if (missingIds.length) {
      const fetched = await this.rolesRepository.find({
        where: { id: In(missingIds) },
      });

      for (const role of fetched) {
        const name = (role?.rol ?? '').trim().toLowerCase();
        if (name) {
          normalized.push(name);
        }
      }
    }

    return normalized;
  }

  private async ensureRevisorExists(userId: number): Promise<void> {
    const existing = await this.revisoresRepository.findOne({
      where: { usuarioId: userId },
    });

    if (existing) {
      return;
    }

    const newRevisor = this.revisoresRepository.create({
      usuarioId: userId,
      perfil: '',
      cargaActual: 0,
      institucion: '',
    });

    await this.revisoresRepository.save(newRevisor);
  }

  private async syncFirebaseAccountStatus(
    correo: string,
    estadoCuenta: boolean,
  ): Promise<void> {
    try {
      const firebaseUser = await this.firebaseAuth.getUserByEmail(correo);
      await this.firebaseAuth.updateUser(firebaseUser.uid, {
        disabled: !estadoCuenta,
      });
    } catch (error) {
      if (this.isFirebaseAuthError(error, 'auth/user-not-found')) {
        throw new BadRequestException(
          'El usuario no existe en Firebase. Usa la acción "Restablecer acceso" para recuperarlo.',
        );
      }

      throw new InternalServerErrorException(
        'No fue posible actualizar el estado de la cuenta en Firebase.',
      );
    }
  }

  private async syncFirebaseUserEmail(
    correoActual: string,
    correoNuevo: string,
  ): Promise<void> {
    try {
      const firebaseUser = await this.firebaseAuth.getUserByEmail(correoActual);
      await this.firebaseAuth.updateUser(firebaseUser.uid, {
        email: correoNuevo,
        emailVerified: false,
      });
    } catch (error) {
      if (this.isFirebaseAuthError(error, 'auth/user-not-found')) {
        throw new BadRequestException(
          'El usuario no existe en Firebase. Usa la acción "Restablecer acceso" antes de cambiar el correo.',
        );
      }

      if (this.isFirebaseAuthError(error, 'auth/email-already-exists')) {
        throw new BadRequestException(
          'El nuevo correo ya está registrado en Firebase.',
        );
      }

      throw new InternalServerErrorException(
        'No fue posible actualizar el correo del usuario en Firebase.',
      );
    }
  }

  private async createFirebaseUserForRecovery(
    correo: string,
    estadoCuenta: boolean,
  ): Promise<void> {
    try {
      await this.firebaseAuth.createUser({
        email: correo,
        password: this.generateTemporaryPassword(),
        emailVerified: false,
        disabled: !estadoCuenta,
      });
    } catch (error) {
      if (this.isFirebaseAuthError(error, 'auth/email-already-exists')) {
        return;
      }

      throw new InternalServerErrorException(
        'No fue posible recrear el usuario en Firebase.',
      );
    }
  }

  async reconcileVerificationStatuses(): Promise<void> {
    const users = await this.userRepository.find();

    for (const user of users) {
      try {
        await this.syncVerificationStatusFromFirebase(user);
      } catch (error) {
        this.logger.warn(
          `No se pudo reconciliar usuario ${user.id} (${user.correo}): ${
            error instanceof Error ? error.message : 'error desconocido'
          }`,
        );
      }
    }
  }

  private generateTemporaryPassword(): string {
    const random = Math.random().toString(36).slice(-8);
    return `Tmp-${Date.now()}-${random}`;
  }

  private async deleteFirebaseUserSilently(firebaseUid: string): Promise<void> {
    try {
      await this.firebaseAuth.deleteUser(firebaseUid);
    } catch {
      // No interrumpir el flujo principal por un error de compensacion.
    }
  }

  private async deleteFirebaseUserByEmail(correo: string): Promise<void> {
    try {
      const firebaseUser = await this.firebaseAuth.getUserByEmail(correo);
      await this.firebaseAuth.deleteUser(firebaseUser.uid);
    } catch (error) {
      if (this.isFirebaseAuthError(error, 'auth/user-not-found')) {
        return;
      }

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'No fue posible eliminar el usuario en Firebase.',
      );
    }
  }

  private async syncVerificationStatusFromFirebase(user: User): Promise<{
    existsInFirebase: boolean;
    emailVerified: boolean;
  }> {
    try {
      const firebaseUser = await this.firebaseAuth.getUserByEmail(user.correo);
      const emailVerified = Boolean(firebaseUser.emailVerified);

      if (user.correo_verificado !== emailVerified) {
        user.correo_verificado = emailVerified;
        await this.userRepository.save(user);
      }

      return { existsInFirebase: true, emailVerified };
    } catch (error) {
      if (this.isFirebaseAuthError(error, 'auth/user-not-found')) {
        if (user.correo_verificado) {
          user.correo_verificado = false;
          await this.userRepository.save(user);
        }

        return { existsInFirebase: false, emailVerified: false };
      }

      throw new InternalServerErrorException(
        'No fue posible validar el estado del correo en Firebase.',
      );
    }
  }

  private isFirebaseAuthError(error: unknown, code: string): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return (error as FirebaseAdminError).code === code;
  }

  async findCoAutores(): Promise<{ id: number; nombre: string }[]> {
    const autores = await this.userRepository
      .createQueryBuilder('usuario')
      .innerJoin('usuario.roles', 'rol')
      .where('rol.rol = :rolNombre', { rolNombre: 'autor' })
      .andWhere('usuario.estado_cuenta = :activo', { activo: true })
      .select(['usuario.id', 'usuario.nombre'])
      .orderBy('usuario.nombre', 'ASC')
      .getMany();

    return autores.map((user) => ({
      id: user.id,
      nombre: user.nombre,
    }));
  }
}
