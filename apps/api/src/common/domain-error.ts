export class DomainError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Array<{ path: string; code: string }>,
    public readonly retryable = false,
  ) { super(message); }
}
