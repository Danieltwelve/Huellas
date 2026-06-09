import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const path = req?.route?.path ?? req?.url ?? 'unknown';
    const method = req?.method ?? 'GET';
    const key = `${method} ${path}`;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        try {
          this.metrics.record(key, ms);
        } catch (e) {
          // swallow metrics errors
        }
        // also simple console.log for immediate visibility
        console.log(`METRICS: ${key} ${ms}ms`);
      }),
    );
  }
}
