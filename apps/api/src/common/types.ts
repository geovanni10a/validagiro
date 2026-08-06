import type { MembershipRole } from '@prisma/client';

export type Permission =
  | 'catalog:read' | 'product:create' | 'product:update'
  | 'batch:create' | 'batch:read' | 'batch:override-entry-date'
  | 'batch:override-expiry-before-entry' | 'promotion-eligibility:update'
  | 'sync:read' | 'sync:read:any';

export interface IdentityContext { userId: string; authSubject: string; displayName: string }
export interface TenantContext extends IdentityContext {
  membershipId: string;
  companyId: string;
  storeId: string;
  storeTimezone: string;
  role: MembershipRole;
  permissions: ReadonlySet<Permission>;
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      identity?: IdentityContext;
      tenant?: TenantContext;
    }
  }
}
