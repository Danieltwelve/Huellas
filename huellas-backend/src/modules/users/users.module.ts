import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Role } from '../roles/roles.entity';
import { FirebaseAdminModule } from '../../common/firebase/firebase-admin.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersVerificationReconcileJob } from './users-verification-reconcile.job';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role]), FirebaseAdminModule],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard, RolesGuard, UsersVerificationReconcileJob],
  exports: [UsersService],
})
export class UsersModule {}
