function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message = error.code === 'LIMIT_FILE_SIZE'
    ? 'The recording is too large. Keep recordings under 25 MB.'
    : error.message || 'Unexpected server error.';
  res.status(status).json({ error: message, code: error.code || 'SERVER_ERROR' });
}

module.exports = { errorHandler };
