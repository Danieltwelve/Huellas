import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { UsersService } from './users.service';

@Injectable()
export class UsersVerificationReconcileJob {
  private readonly logger = new Logger(UsersVerificationReconcileJob.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 0 3 * * *')
  async reconcileVerificationStatus(): Promise<void> {
    const enabled =
      this.configService.get<string>('USER_VERIFICATION_RECONCILE_ENABLED') ===
      'true';

    if (!enabled) {
      return;
    }

    this.logger.log('Iniciando reconciliacion programada de correos verificados.');
    await this.usersService.reconcileVerificationStatuses();
    this.logger.log('Reconciliacion programada finalizada.');
  }
}
