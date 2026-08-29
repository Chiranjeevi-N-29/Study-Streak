import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getUserById } from './auth.service.js';
import { signToken } from './auth.utils.js';
import { config } from '../../config/index.js';

export const handleRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const handleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    const token = signToken({ userId: user.id });

    // Set JWT in HTTP-Only, Secure, SameSite Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const handleLogout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

export const handleMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.user is injected by requireAuth middleware
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    
    const user = await getUserById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
