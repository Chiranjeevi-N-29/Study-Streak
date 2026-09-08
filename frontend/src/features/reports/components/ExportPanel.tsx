import React, { useState } from 'react';
import type { ReportRange, ExportDataset, ExportFormat } from '../../../services/api.js';
import { reportsApi } from '../../../services/api.js';

interface Props {
  activeRange: ReportRange;
  customStart?: string;
  customEnd?: string;
}

interface ExportOption {
  dataset: ExportDataset;
  label: string;
  description: string;
  icon: string;
  supportsAll: boolean; // whether dataset='all' JSON available
}

const EXPORT_OPTIONS: ExportOption[] = [
  { dataset: 'tasks', label: 'Tasks', description: 'All study tasks with duration & status', icon: '✅', supportsAll: false },
  { dataset: 'focus_sessions', label: 'Focus Sessions', description: 'Every focus timer session with duration', icon: '⏱', supportsAll: false },
  { dataset: 'study_history', label: 'Study History', description: 'Daily plan summaries with completion', icon: '📅', supportsAll: false },
  { dataset: 'goals', label: 'Goals', description: 'Study goals with milestones & progress', icon: '🎯', supportsAll: false },
  { dataset: 'all', label: 'Everything (JSON)', description: 'All datasets in a single JSON file', icon: '📦', supportsAll: true },
];

export const ExportPanel: React.FC<Props> = ({ activeRange, customStart, customEnd }) => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState<ExportDataset | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerExport = async (dataset: ExportDataset) => {
    // 'all' dataset only works with JSON
    const format = dataset === 'all' ? 'json' : activeFormat;

    try {
      setExporting(dataset);
      setStatus(null);
      await reportsApi.downloadExport({
        format,
        dataset,
        range: activeRange,
        startDate: customStart,
        endDate: customEnd,
      });
      setStatus({ type: 'success', message: `${dataset === 'all' ? 'Full export' : dataset} downloaded successfully.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setStatus({ type: 'error', message: msg });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="export-panel">
      {/* Format Toggle */}
      <div>
        <div className="export-section-title">Export Format</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['json', 'csv'] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              className="export-btn"
              style={{
                flex: 'none',
                width: 'auto',
                padding: '8px 18px',
                borderColor: activeFormat === fmt ? 'var(--primary)' : undefined,
                background: activeFormat === fmt ? 'var(--accent-bg)' : undefined,
                fontWeight: activeFormat === fmt ? 700 : 400,
                color: activeFormat === fmt ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          {activeFormat === 'json'
            ? 'JSON is machine-readable and preserves all data structures.'
            : 'CSV is spreadsheet-compatible. Select a single dataset (not "Everything").'}
        </p>
      </div>

      {/* Export Buttons */}
      <div>
        <div className="export-section-title">Choose Dataset</div>
        <div className="export-buttons-grid">
          {EXPORT_OPTIONS.map((opt) => {
            const isDisabled = !!exporting || (activeFormat === 'csv' && opt.dataset === 'all');
            const isLoading = exporting === opt.dataset;
            return (
              <button
                key={opt.dataset}
                id={`export-btn-${opt.dataset}`}
                className="export-btn"
                disabled={isDisabled}
                onClick={() => triggerExport(opt.dataset)}
                title={
                  isDisabled && activeFormat === 'csv' && opt.dataset === 'all'
                    ? 'Switch to JSON to export all datasets together'
                    : undefined
                }
              >
                <span className="export-btn-icon">{isLoading ? '⏳' : opt.icon}</span>
                <span className="export-btn-text">
                  <span className="export-btn-title">
                    {opt.label}
                    {activeFormat === 'csv' && opt.dataset === 'all' ? ' (JSON only)' : ''}
                  </span>
                  <span className="export-btn-sub">{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status message */}
      {status && (
        <div className={`export-status ${status.type}`}>
          <span>{status.type === 'success' ? '✅' : '❌'}</span>
          <span>{status.message}</span>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        Exports contain only <strong>your own data</strong>. Sensitive fields (passwords, internal tokens) are never included.
        The date range applied is the currently selected report period.
      </p>
    </div>
  );
};
