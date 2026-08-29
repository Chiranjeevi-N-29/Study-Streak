import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import bcrypt from 'bcrypt';
import { signToken } from './auth.utils.js';

vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe('Authentication API Endpoints', () => {
  const testUser = {
    id: 'test-user-id',
    name: 'Chiranjeevi',
    email: 'chiranjeevi@example.com',
    passwordHash: '',
    timezone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    testUser.passwordHash = await bcrypt.hash('securePassword123', 12);
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      // Mock: no user exists with this email
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      // Mock: creating the user returns the user object
      vi.mocked(prisma.user.create).mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Chiranjeevi',
          email: 'chiranjeevi@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('id', testUser.id);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should return 409 Conflict if email is already registered', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Chiranjeevi',
          email: 'chiranjeevi@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should return 400 Bad Request on invalid email or weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Chiranjeevi',
          email: 'not-an-email',
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully and set HttpOnly session cookie', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'chiranjeevi@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('id', testUser.id);

      // Verify token cookie is set
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=');
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Strict');
    });

    it('should return 401 Unauthorized for incorrect password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'chiranjeevi@example.com',
          password: 'wrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the current authenticated user details', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUser);
      const token = signToken({ userId: testUser.id });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should return 401 Unauthorized if request has no token cookie', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No token provided');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the token cookie successfully', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=;');
    });
  });
});
