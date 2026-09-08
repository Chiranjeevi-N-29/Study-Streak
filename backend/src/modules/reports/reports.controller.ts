import { Request, Response } from 'express';
import { reportQuerySchema, exportQuerySchema } from './reports.schema.js';
import * as reportsService from './reports.service.js';
import * as exportService from './export.service.js';

// GET /api/reports?range=30d&startDate=...&endDate=...
export const handleGetReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parseResult = reportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const { range, startDate, endDate } = parseResult.data;

    if (range === 'custom' && (!startDate || !endDate)) {
      res.status(400).json({ error: 'Custom range requires both startDate and endDate' });
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      res.status(400).json({ error: 'startDate must be on or before endDate' });
      return;
    }

    const report = await reportsService.getUserReport(userId, range, startDate, endDate);

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error while generating report' });
  }
};

// GET /api/reports/export?format=json|csv&dataset=all&range=all
export const handleExport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parseResult = exportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const { format, dataset, range, startDate, endDate } = parseResult.data;

    const result = await exportService.buildExport(
      userId,
      format,
      dataset,
      range,
      startDate,
      endDate
    );

    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Type', result.contentType);
    res.status(200).send(result.content);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error during export';
    const isUserError = msg.includes('CSV export requires');
    console.error('Error generating export:', error);
    res.status(isUserError ? 400 : 500).json({ error: msg });
  }
};
