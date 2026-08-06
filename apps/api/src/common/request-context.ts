import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { DomainError } from './domain-error';
import type { IdentityContext, TenantContext } from './types';

export const Tenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): TenantContext => {
  const tenant = ctx.switchToHttp().getRequest<Request>().tenant;
  if (!tenant) throw new DomainError(500, 'TENANT_CONTEXT_MISSING', 'Contexto da loja não resolvido.');
  return tenant;
});

export const Identity = createParamDecorator((_data: unknown, ctx: ExecutionContext): IdentityContext => {
  const identity = ctx.switchToHttp().getRequest<Request>().identity;
  if (!identity) throw new DomainError(500, 'IDENTITY_CONTEXT_MISSING', 'Contexto de identidade não resolvido.');
  return identity;
});
