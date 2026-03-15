import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { FirebaseAdminModule } from '../../common/firebase/firebase-admin.module';

@Module({
  imports: [UsersModule, FirebaseAdminModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
