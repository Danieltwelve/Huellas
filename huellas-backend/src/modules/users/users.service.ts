import {
  BadRequestException,
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
import { ConfigService } from '@nestjs/config';

interface FirebaseErrorResponse {
  error?: {
    message?: string;
  };
}

interface FirebaseSignUpResponse {
  idToken?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
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
    const webApiKey = this.configService.get<string>('FIREBASE_WEB_API_KEY');

    if (!webApiKey) {
      throw new InternalServerErrorException(
        'FIREBASE_WEB_API_KEY no está configurada en el backend.',
      );
    }

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

    const signUpPayload =
      (await signUpResponse.json()) as FirebaseSignUpResponse &
        FirebaseErrorResponse;

    if (!signUpResponse.ok || !signUpPayload.idToken) {
      const errorMessage = signUpPayload.error?.message;
      if (errorMessage === 'EMAIL_EXISTS') {
        throw new BadRequestException(
          'El correo ya está registrado en Firebase.',
        );
      }

      throw new InternalServerErrorException(
        'No fue posible crear el usuario en Firebase.',
      );
    }

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
        'No fue posible enviar el correo de verificación.',
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

    Object.assign(user, data);
    return await this.userRepository.save(user);
  }
}
