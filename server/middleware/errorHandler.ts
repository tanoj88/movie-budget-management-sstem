import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: string;

  constructor(message: string, statusCode = 400, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const code = err?.code || '';
  const msg = String(err?.message || '');

  if (code === 'ER_DUP_ENTRY' || msg.includes('UNIQUE constraint failed')) {
    res.status(409).json({
      error: 'A record with this unique value already exists.',
    });
    return;
  }

  if (
    code === 'ER_ROW_IS_REFERENCED_2' ||
    code === 'ER_ROW_IS_REFERENCED' ||
    msg.includes('FOREIGN KEY constraint failed')
  ) {
    res.status(409).json({
      error: 'Cannot delete this record because it is referenced by other records.',
    });
    return;
  }

  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
    res.status(400).json({
      error: 'Referenced parent record does not exist.',
    });
    return;
  }

  console.error('[API Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' ? { details: msg } : {}),
  });
}
