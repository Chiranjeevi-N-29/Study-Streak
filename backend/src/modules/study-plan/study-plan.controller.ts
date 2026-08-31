import { Request, Response, NextFunction } from 'express';
import * as studyPlanService from './study-plan.service.js';
import { dateRangeQuerySchema } from './study-plan.schema.js';

export const handleCreateStudyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const plan = await studyPlanService.createStudyPlan(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Study plan created successfully',
      studyPlan: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetTodayStudyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const plan = await studyPlanService.getTodayStudyPlan(req.user.id, req.user.timezone);
    
    // If no plan exists, return success with null studyPlan
    res.status(200).json({
      success: true,
      studyPlan: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetStudyPlansByRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Validate query parameters using Zod
    const query = dateRangeQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: query.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const plans = await studyPlanService.getStudyPlansByRange(
      req.user.id,
      query.data.startDate,
      query.data.endDate
    );

    res.status(200).json({
      success: true,
      studyPlans: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetStudyPlanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const plan = await studyPlanService.getStudyPlanById(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      studyPlan: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateStudyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const plan = await studyPlanService.updateStudyPlan(req.user.id, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Study plan updated successfully',
      studyPlan: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteStudyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await studyPlanService.deleteStudyPlan(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Study plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
