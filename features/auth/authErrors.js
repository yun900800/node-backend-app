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
