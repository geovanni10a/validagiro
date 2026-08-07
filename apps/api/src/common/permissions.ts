import type { MembershipRole } from '@prisma/client';
import type { Permission } from './types';

const permissions: Record<MembershipRole, readonly Permission[]> = {
  COMPANY_ADMIN: ['catalog:read', 'product:create', 'product:update', 'batch:create', 'batch:read', 'batch:override-entry-date', 'batch:override-expiry-before-entry', 'promotion-eligibility:update', 'sync:read', 'sync:read:any'],
  STORE_MANAGER: ['catalog:read', 'product:create', 'product:update', 'batch:create', 'batch:read', 'batch:override-entry-date', 'batch:override-expiry-before-entry', 'promotion-eligibility:update', 'sync:read', 'sync:read:any'],
  STOCK_OPERATOR: ['catalog:read', 'product:create', 'batch:create', 'batch:read', 'sync:read'],
  VIEWER: ['catalog:read', 'batch:read', 'sync:read'],
};

export function permissionsFor(role: MembershipRole): ReadonlySet<Permission> { return new Set(permissions[role]); }
