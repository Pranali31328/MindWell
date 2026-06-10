/**
 * Global error handler middleware.
 * Must be the LAST middleware registered with app.use().
 * Catches any error passed via next(err).
 */
function errorMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';

  console.error(`[Error] ${req.method} ${req.originalUrl} → ${status}: ${message}`);
  if (isDev && err.stack) {
    console.error(err.stack);
  }

  res.status(status).json({
    error: message,
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorMiddleware };
