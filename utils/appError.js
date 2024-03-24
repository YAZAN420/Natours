class AppError extends Error {
  constructor(message, statuscode) {
    super(message);
    this.statuscode = statuscode;
    this.status = `${statuscode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.Message = message;

    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;
