export function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const statusCode = err?.statusCode || err?.status || 500;
  const message = err?.message || 'Internal Server Error';
  res.status(statusCode).json({ message });
}

