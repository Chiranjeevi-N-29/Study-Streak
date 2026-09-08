import { Request, Response, NextFunction } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
} from './profile-preferences.service.js';
import {
  updateProfileSchema,
  updatePreferencesSchema,
} from './profile-preferences.schema.js';

export const handleGetProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const profile = await getUserProfile(userId);
    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMsg,
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const profile = await updateUserProfile(userId, parseResult.data);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const preferences = await getUserPreferences(userId);
    res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    next(error);
  }
};

export const handleUpdatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parseResult = updatePreferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMsg,
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const preferences = await updateUserPreferences(userId, parseResult.data);
    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preferences,
    });
  } catch (error) {
    next(error);
  }
};
