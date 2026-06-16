import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Error interno del servidor';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      if (typeof resContent === 'object' && resContent !== null) {
        message = (resContent as any).message || exception.message;
        errors = (resContent as any).errors || null;
      } else {
        message = resContent || exception.message;
      }
    } else if (exception instanceof QueryFailedError) {
      // Manejar violaciones de restricciones de base de datos
      const driverError = exception.driverError;
      if (driverError && driverError.code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'El registro ya existe (violación de clave única).';
        // Extraer detalle si existe
        if (driverError.detail) {
          message = `${message} Detalle: ${driverError.detail}`;
        }
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Error en la operación de base de datos.';
      }
      this.logger.error(
        `[Database Error] ${exception.message} - SQL: ${exception.query} - Parameters: ${JSON.stringify(exception.parameters)}`,
      );
    } else {
      // Error no controlado
      const err = exception as Error;
      this.logger.error(
        `[Unhandled Error] ${err?.message || exception}`,
        err?.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
      allMessages: Array.isArray(message) ? message : undefined,
      errors: errors || undefined,
    });
  }
}
