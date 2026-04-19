import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, originalUrl = request.url } = request;

    return next.handle().pipe(
      tap((payload) => {
        this.logger.log(
          JSON.stringify({
            method,
            path: originalUrl,
            statusCode: response.statusCode,
            payload,
          }),
        );
      }),
      catchError((error: Error) => {
        const maybeHttpError = error as Error & {
          getStatus?: () => number;
        };
        const statusCode =
          typeof maybeHttpError.getStatus === 'function'
            ? maybeHttpError.getStatus()
            : response.statusCode;

        this.logger.error(
          JSON.stringify({
            method,
            path: originalUrl,
            statusCode,
            error: error.message,
          }),
        );
        return throwError(() => error);
      }),
    );
  }
}
