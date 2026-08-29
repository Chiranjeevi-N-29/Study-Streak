import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

interface TokenPayload {
  userId: string;
}

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h',
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};
