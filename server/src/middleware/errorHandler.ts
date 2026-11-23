import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err);

  const statusCode = err.statusCode || (err.code === 'SLOT_UNAVAILABLE' ? 409 : 500);
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}
