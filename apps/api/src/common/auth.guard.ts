import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DomainError } from './domain-error';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const subject = await this.resolveSubject(request);
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_subject', ${subject}, true)`;
      return tx.user.findUnique({ where: { authSubject: subject } });
    });
    if (!user || user.status !== 'ACTIVE') throw new DomainError(401, 'UNAUTHORIZED', 'Usuário inativo ou não cadastrado.');
    request.identity = { userId: user.id, authSubject: subject, displayName: user.displayName };
    return true;
  }

  private async resolveSubject(request: Request): Promise<string> {
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (isDev && process.env.DEV_AUTH_ENABLED === 'true') {
      const subject = request.header('x-dev-auth-subject') ?? process.env.DEV_AUTH_SUBJECT;
      if (subject) return subject;
    }
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) throw new DomainError(401, 'UNAUTHORIZED', 'Token Bearer ausente.');
    const issuer = process.env.JWT_ISSUER;
    const audience = process.env.JWT_AUDIENCE;
    const jwksUri = process.env.JWT_JWKS_URI;
    if (!issuer || !audience || !jwksUri) throw new DomainError(500, 'AUTH_CONFIGURATION_ERROR', 'Autenticação não configurada.');
    try {
      const { createRemoteJWKSet, jwtVerify } = await import('jose');
      const result = await jwtVerify(authorization.slice(7), createRemoteJWKSet(new URL(jwksUri)), {
        issuer, audience, algorithms: ['RS256', 'ES256'],
      });
      if (!result.payload.sub) throw new Error('missing sub');
      return result.payload.sub;
    } catch {
      throw new DomainError(401, 'UNAUTHORIZED', 'Token inválido ou expirado.');
    }
  }
}
