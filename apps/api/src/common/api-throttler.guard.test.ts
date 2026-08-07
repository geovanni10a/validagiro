import { describe, expect, it } from 'vitest';
import { ApiThrottlerGuard } from './api-throttler.guard';

class ExposedGuard extends ApiThrottlerGuard {
  tracker(request: Record<string, any>) { return this.getTracker(request); }
}

const guard = Object.create(ExposedGuard.prototype) as ExposedGuard;
const deviceId = '2bee39bc-d06b-4e53-9e1b-1f61eb187251';

describe('ApiThrottlerGuard tracker', () => {
  it('keys intake limits by resolved user and validated device', async () => {
    const base = { method: 'POST', originalUrl: '/v1/intake-submissions', identity: { userId: 'user-1' }, body: { device: { deviceId } }, headers: { 'x-device-id': deviceId } };
    await expect(guard.tracker(base)).resolves.toBe(await guard.tracker({ ...base }));
    await expect(guard.tracker({ ...base, identity: { userId: 'user-2' } })).resolves.not.toBe(await guard.tracker(base));
  });

  it('rejects a device header that disagrees with the validated body', async () => {
    await expect(guard.tracker({ method: 'POST', originalUrl: '/v1/intake-submissions', identity: { userId: 'user-1' }, body: { device: { deviceId } }, headers: { 'x-device-id': crypto.randomUUID() } })).rejects.toMatchObject({ code: 'DEVICE_ID_MISMATCH' });
  });
});
