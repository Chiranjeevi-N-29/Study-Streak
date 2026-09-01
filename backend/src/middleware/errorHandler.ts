import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

const getErrorCode = (statusCode: number): string => {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const code = err.code || getErrorCode(statusCode);
  const rawMessage = err.message || 'Internal Server Error';

  // Sanitize internal server error messages in production
  const message =
    statusCode >= 500 && config.nodeEnv === 'production'
      ? 'An internal server error occurred'
      : rawMessage;

  logger.error(
    `[Error] ${statusCode} - ${rawMessage}`,
    {
      url: req.originalUrl,
      method: req.method,
      stack: err.stack,
    },
    req.requestId
  );

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
    },
  });
};
