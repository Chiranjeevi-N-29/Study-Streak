import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.utils.js';
import { prisma } from '../config/db.js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required: No token provided',
      });
      return;
    }

    let decoded: { userId: string };
    try {
      decoded = verifyToken(token);
    } catch (err) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid or expired token',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, timezone: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed: User account no longer exists',
      });
      return;
    }

    // Attach safe user details to Request object
    req.user = {
      id: user.id,
      email: user.email,
      timezone: user.timezone,
    };

    next();
  } catch (error) {
    next(error);
  }
};
