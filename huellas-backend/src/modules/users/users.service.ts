/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
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

interface FirebaseAdminError {
  code?: string;
}

@Injectable()
export class UsersService {
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

    await this.createFirebaseUserAndSendVerification(
      adminCreateDto.correo,
      adminCreateDto.contraseña,
    );

    const newUser = this.userRepository.create({
      nombre: adminCreateDto.nombre,
      correo: adminCreateDto.correo,
      telefono: adminCreateDto.telefono ?? '',
    });

    newUser.roles = [role];
    const savedUser = await this.userRepository.save(newUser);
    return savedUser;
  }

  private async createFirebaseUserAndSendVerification(
    correo: string,
    contraseña: string,
  ): Promise<void> {
    const webApiKey =
      this.configService.get<string>('FIREBASE_WEB_API_KEY') ||
      process.env.FIREBASE_WEB_API_KEY;

    if (!webApiKey) {
      throw new InternalServerErrorException(
        'FIREBASE_WEB_API_KEY no está configurada.',
      );
    }

    // 1. Crear usuario obteniendo el idToken (API REST Cliente)
    // Ya no hay "try {" envolviendo esto
    const signUpResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${webApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: correo,
          password: contraseña,
          returnSecureToken: true,
        }),
      },
    );

    const signUpPayload = await signUpResponse.json();

    if (!signUpResponse.ok || !signUpPayload.idToken) {
      if (signUpPayload.error?.message === 'EMAIL_EXISTS') {
        throw new BadRequestException(
          'El correo ya está registrado en Firebase.',
        );
      }
      throw new InternalServerErrorException(
        'No fue posible crear el usuario en Firebase.',
      );
    }

    // 2. Enviar correo de verificación (API REST Cliente)
    const verificationResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${webApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken: signUpPayload.idToken,
        }),
      },
    );

    if (!verificationResponse.ok) {
      throw new InternalServerErrorException(
        'No fue posible enviar el correo de verificación de Firebase.',
      );
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
    return this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (typeof data.estado_cuenta === 'boolean') {
      const correo = data.correo?.trim() || user.correo;
      await this.syncFirebaseAccountStatus(correo, data.estado_cuenta);
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
        throw new NotFoundException('Usuario no encontrado en Firebase.');
      }

      throw new InternalServerErrorException(
        'No fue posible actualizar el estado de la cuenta en Firebase.',
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
