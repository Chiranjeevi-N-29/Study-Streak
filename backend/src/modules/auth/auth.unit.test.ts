import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { signToken, verifyToken } from './auth.utils.js';

describe('Auth Utilities - bcrypt', () => {
  it('should hash password and successfully verify it', async () => {
    const password = 'mySecretPassword123';
    const hash = await bcrypt.hash(password, 12);
    
    expect(hash).not.toBe(password);
    
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
    
    const isInvalid = await bcrypt.compare('wrongPassword', hash);
    expect(isInvalid).toBe(false);
  });
});

describe('Auth Utilities - JWT', () => {
  it('should sign and verify JWT tokens containing user ID', () => {
    const payload = { userId: 'user-uuid-1234' };
    const token = signToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const decoded = verifyToken(token);
    expect(decoded).toHaveProperty('userId', 'user-uuid-1234');
  });

  it('should throw an error for expired or invalid tokens', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });
});
