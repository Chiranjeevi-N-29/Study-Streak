import { Request, Response, NextFunction } from 'express';
import * as studyTaskService from './study-task.service.js';

export const handleCreateStudyTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const task = await studyTaskService.createStudyTask(req.user.id, req.params.planId, req.body);
    res.status(201).json({
      success: true,
      message: 'Study task created successfully',
      studyTask: task,
    });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateStudyTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const task = await studyTaskService.updateStudyTask(req.user.id, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Study task updated successfully',
      studyTask: task,
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteStudyTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await studyTaskService.deleteStudyTask(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Study task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const handleReorderStudyTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { orderedTaskIds } = req.body;
    await studyTaskService.reorderStudyTasks(req.user.id, req.params.planId, orderedTaskIds);
    res.status(200).json({
      success: true,
      message: 'Study tasks reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};
