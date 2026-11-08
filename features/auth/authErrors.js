// Errors raised when the auth-service hop fails. Kept dependency-free so both
// the HTTP client and tests can import it without loading config/db modules.
export class AuthServiceError extends Error {
  constructor(status, message, upstream) {
    super(message);
    this.name = 'AuthServiceError';
    this.status = status;
    this.upstream = upstream;
  }
}

export class ProfileConflictError extends Error {
  constructor(message = '该邮箱已被其他档案占用，请联系管理员') {
    super(message);
    this.name = 'ProfileConflictError';
    this.status = 409;
  }
}
