import React, { useState } from 'react';
import type { AnalyticsSummary } from '../../../services/api.js';
import '../Analytics.css';

interface CompletionTrendChartProps {
  data: AnalyticsSummary['weeklyBreakdown'];
}

export const CompletionTrendChart: React.FC<CompletionTrendChartProps> = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    rate: number;
    x: number;
    y: number;
  } | null>(null);

  if (!data || data.length === 0) {
    return <div className="analytics-empty-card">No weekly trend data available</div>;
  }

  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingBottom = 35;
  const paddingTop = 20;
  const paddingRight = 25;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Y axis 0 - 100%
  const yTicks = [0, 50, 100];

  const points = data.map((d, index) => {
    const x =
      paddingLeft +
      (data.length === 1
        ? chartWidth / 2
        : (index / (data.length - 1)) * chartWidth);
    const y = paddingTop + chartHeight - (d.completionRate / 100) * chartHeight;
    return { ...d, x, y };
  });

  // Build SVG path d string
  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div className="svg-chart-container">
      <svg
        className="svg-chart"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Completion rate trend chart"
      >
        {/* Y Gridlines and Labels */}
        {yTicks.map((tickVal) => {
          const y = paddingTop + chartHeight - (tickVal / 100) * chartHeight;
          return (
            <g key={`ytick-${tickVal}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                className="chart-grid-line"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="chart-axis-text"
              >
                {tickVal}%
              </text>
            </g>
          );
        })}

        {/* Trend Line Path */}
        {points.length > 1 && <path d={pathD} className="trend-line" />}

        {/* Points & X Axis Labels */}
        {points.map((pt) => (
          <g key={pt.weekLabel}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={4}
              className="trend-point"
              onMouseEnter={() =>
                setHoveredPoint({
                  label: pt.weekLabel,
                  rate: pt.completionRate,
                  x: pt.x,
                  y: pt.y,
                })
              }
              onMouseLeave={() => setHoveredPoint(null)}
              tabIndex={0}
              role="graphics-symbol"
              aria-label={`${pt.weekLabel}: ${pt.completionRate}% completion`}
            />
            <text
              x={pt.x}
              y={svgHeight - 8}
              textAnchor="middle"
              className="chart-axis-text"
            >
              {pt.weekLabel}
            </text>
          </g>
        ))}

        {/* Tooltip Overlay */}
        {hoveredPoint && (
          <g transform={`translate(${hoveredPoint.x}, ${Math.max(25, hoveredPoint.y - 15)})`}>
            <rect
              x="-50"
              y="-22"
              width="100"
              height="24"
              rx="4"
              fill="#1e293b"
              opacity="0.9"
            />
            <text
              x="0"
              y="-6"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="600"
            >
              {hoveredPoint.label}: {hoveredPoint.rate}%
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
