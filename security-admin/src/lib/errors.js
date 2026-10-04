class SecurityAdminError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'SecurityAdminError';
    this.code = code;
    this.status = status;
  }
}

module.exports = { SecurityAdminError };
