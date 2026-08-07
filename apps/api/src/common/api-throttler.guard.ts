import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { uuidV4Schema } from '@validagiro/contracts';
import { DomainError } from './domain-error';

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: Record<string, any>): Promise<string> {
    const userId = request.identity?.userId;
    if (!userId) throw new DomainError(401, 'UNAUTHORIZED', 'Identidade não resolvida para rate limit.');
    let device = 'no-device';
    const path = String(request.originalUrl ?? '').split('?')[0]?.replace(/\/+$/, '');
    if (request.method === 'POST' && path?.endsWith('/intake-submissions')) {
      const bodyDevice = request.body?.device?.deviceId;
      const headerDevice = request.headers?.['x-device-id'];
      if (!uuidV4Schema.safeParse(bodyDevice).success) throw new DomainError(422, 'INVALID_DEVICE_ID', 'device.deviceId deve ser UUID v4.');
      if (headerDevice !== undefined && (typeof headerDevice !== 'string' || headerDevice !== bodyDevice)) {
        throw new DomainError(422, 'DEVICE_ID_MISMATCH', 'X-Device-Id difere de device.deviceId.');
      }
      device = bodyDevice;
    }
    return createHash('sha256').update(`${userId}:${device}`).digest('hex');
  }
}
