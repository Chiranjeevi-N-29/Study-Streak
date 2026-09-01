import { config } from './index.js';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  requestId?: string;
  meta?: Record<string, any>;
}

const maskSensitiveData = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitiveData);

  const masked: Record<string, any> = {};
  const sensitiveKeys = ['password', 'token', 'jwt', 'secret', 'cookie', 'authorization'];

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      masked[key] = '***MASKED***';
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
};

const formatLog = (level: LogLevel, payload: LogPayload) => {
  const logObj = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    requestId: payload.requestId || 'N/A',
    message: payload.message,
    ...(payload.meta ? { meta: maskSensitiveData(payload.meta) } : {}),
  };

  if (config.nodeEnv === 'test') {
    // Suppress logs in unit/integration test runs
    return;
  }

  if (config.nodeEnv === 'production') {
    console.log(JSON.stringify(logObj));
  } else {
    console.log(`[${logObj.timestamp}] [${logObj.level}] [${logObj.requestId}] ${logObj.message}`);
  }
};

export const logger = {
  info: (message: string, meta?: Record<string, any>, requestId?: string) =>
    formatLog('info', { message, meta, requestId }),
  warn: (message: string, meta?: Record<string, any>, requestId?: string) =>
    formatLog('warn', { message, meta, requestId }),
  error: (message: string, meta?: Record<string, any>, requestId?: string) =>
    formatLog('error', { message, meta, requestId }),
  debug: (message: string, meta?: Record<string, any>, requestId?: string) =>
    formatLog('debug', { message, meta, requestId }),
};
