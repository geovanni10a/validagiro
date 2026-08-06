import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function correlationMiddleware(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header('x-correlation-id');
  request.correlationId = incoming && UUID.test(incoming) ? incoming : randomUUID();
  response.setHeader('X-Correlation-Id', request.correlationId);
  next();
}
