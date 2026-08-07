import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { DomainError } from './domain-error';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Erro interno inesperado.';
    let retryable = true;
    let fields: Array<{ path: string; code: string }> | undefined;

    if (exception instanceof DomainError) {
      ({ status, code, message, retryable, fields } = exception);
    } else if (exception instanceof ZodError) {
      status = 422;
      code = 'VALIDATION_FAILED';
      message = 'Os dados enviados são inválidos.';
      retryable = false;
      fields = exception.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code }));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR';
      message = status === 401 ? 'Autenticação necessária.' : status === 403 ? 'Acesso não autorizado.' : status === 429 ? 'Limite temporário de requisições excedido.' : exception.message;
      retryable = status === 429 || status >= 500;
      if (status === 429) response.setHeader('Retry-After', '60');
    } else {
      // Internal details intentionally stay server-side.
      console.error(JSON.stringify({ level: 'error', correlationId: request.correlationId, error: exception instanceof Error ? exception.message : 'unknown' }));
    }

    response.status(status).json({ error: { code, message, ...(fields ? { fields } : {}), retryable, correlationId: request.correlationId } });
  }
}
