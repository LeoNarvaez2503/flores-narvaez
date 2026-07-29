import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Error interno del servidor';
    let error = 'InternalServerError';
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      message = typeof resp === 'string' ? resp : (resp as Record<string, unknown>).message;
      error = exception.name;
    } else if (exception instanceof Error) {
      error = exception.name;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: (request.headers['x-request-id'] as string) ?? undefined,
    });
  }
}
