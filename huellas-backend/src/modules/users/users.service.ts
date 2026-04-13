/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create.users.dto';
import { Role } from '../roles/roles.entity';
import { AdminCreateUserDto } from './dto/admin.create.users.dto';
import { Auth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../../common/firebase/firebase-admin.constants';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

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

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
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
      throw new BadRequestException('El correo del usuario ya está verificado.');
    }

    await this.sendVerificationEmail(user.correo, true);
  }

  async restoreFirebaseAccess(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { existsInFirebase } = await this.syncVerificationStatusFromFirebase(user);

    if (!existsInFirebase) {
      await this.createFirebaseUserForRecovery(user.correo, user.estado_cuenta);
    } else {
      await this.syncFirebaseAccountStatus(user.correo, user.estado_cuenta);
    }

    user.correo_verificado = false;
    await this.userRepository.save(user);

    await this.sendPasswordResetEmail(user.correo, true);
  }

  private async sendVerificationEmail(correo: string, strictSmtp: boolean): Promise<void> {
    const verificationLink = await this.firebaseAuth.generateEmailVerificationLink(
      correo,
    );

    const sentBySmtp = await this.sendVerificationEmailBySmtp(
      correo,
      verificationLink,
    );

    if (sentBySmtp) {
      return;
    }

    if (strictSmtp) {
      throw new InternalServerErrorException(
        'No fue posible enviar el correo de verificación. Verifica la configuración SMTP.',
      );
    }
  }

  private async sendPasswordResetEmail(correo: string, strictSmtp: boolean): Promise<void> {
    const resetLink = await this.firebaseAuth.generatePasswordResetLink(correo);
    const sentBySmtp = await this.sendPasswordResetEmailBySmtp(correo, resetLink);

    if (sentBySmtp) {
      return;
    }

    if (strictSmtp) {
      throw new InternalServerErrorException(
        'No fue posible enviar el correo para restablecer el acceso. Verifica la configuración SMTP.',
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
      where: { rol: 'admin' },
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

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['roles'] });
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

  async findAvailableRoles(): Promise<Role[]> {
    return this.rolesRepository.find({ order: { id: 'ASC' } });
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
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const correoActual = user.correo.trim().toLowerCase();
    const correoNuevo =
      typeof data.correo === 'string'
        ? data.correo.trim().toLowerCase()
        : correoActual;
    const correoCambiado = correoNuevo !== correoActual;
    const requiresFirebaseSync =
      correoCambiado || typeof data.estado_cuenta === 'boolean';

    if (requiresFirebaseSync) {
      const { existsInFirebase } = await this.syncVerificationStatusFromFirebase(user);

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

      const estadoCuentaDestino =
        typeof data.estado_cuenta === 'boolean'
          ? data.estado_cuenta
          : user.estado_cuenta;

      await this.syncFirebaseUserEmail(
        correoActual,
        correoNuevo,
        estadoCuentaDestino,
      );

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
    return await this.userRepository.save(user);
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
    estadoCuenta: boolean,
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
}
