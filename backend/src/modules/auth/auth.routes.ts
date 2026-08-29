import { Router } from 'express';
import {
  handleRegister,
  handleLogin,
  handleLogout,
  handleMe,
} from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), handleRegister);
router.post('/login', validate(loginSchema), handleLogin);
router.post('/logout', handleLogout);
router.get('/me', requireAuth, handleMe);

export default router;
