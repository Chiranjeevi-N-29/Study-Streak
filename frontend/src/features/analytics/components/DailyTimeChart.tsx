import React, { useState } from 'react';
import type { AnalyticsSummary } from '../../../services/api.js';
import '../Analytics.css';

interface DailyTimeChartProps {
  data: AnalyticsSummary['dailyTimeSeries'];
}

export const DailyTimeChart: React.FC<DailyTimeChartProps> = ({ data }) => {
  const [hoveredBar, setHoveredBar] = useState<{
    date: string;
    minutes: number;
    x: number;
    y: number;
  } | null>(null);

  if (!data || data.length === 0) {
    return <div className="analytics-empty-card">No daily data to display</div>;
  }

  const maxMinutes = Math.max(60, ...data.map((d) => d.studyMinutes));

  // Chart dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingRight = 20;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const barCount = data.length;
  const gapRatio = 0.2;
  const rawBarWidth = chartWidth / barCount;
  const barWidth = Math.max(4, rawBarWidth * (1 - gapRatio));

  // Y-axis grid ticks (0, max/2, max)
  const ticks = [0, Math.round(maxMinutes / 2), maxMinutes];

  return (
    <div className="svg-chart-container">
      <svg
        className="svg-chart"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Daily study time bar chart"
      >
        {/* Y Gridlines and Labels */}
        {ticks.map((tickVal) => {
          const y = paddingTop + chartHeight - (tickVal / maxMinutes) * chartHeight;
          return (
            <g key={`tick-${tickVal}`}>
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
                {tickVal}m
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, index) => {
          const x = paddingLeft + index * rawBarWidth + (rawBarWidth - barWidth) / 2;
          const barH = (d.studyMinutes / maxMinutes) * chartHeight;
          const y = paddingTop + chartHeight - barH;

          // Color logic based on status
          let fillColor = '#3b82f6'; // default blue
          if (d.status === 'COMPLETED') fillColor = '#22c55e'; // green
          else if (d.status === 'REST_DAY') fillColor = '#60a5fa'; // soft blue
          else if (d.status === 'MISSED') fillColor = '#ef4444'; // red

          // Show X axis labels periodically to prevent clutter
          const showLabel =
            barCount <= 14 || index % Math.ceil(barCount / 10) === 0 || index === barCount - 1;

          const displayDay = d.date.slice(5); // MM-DD

          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barH)}
                rx={3}
                fill={fillColor}
                className="bar-rect"
                onMouseEnter={() =>
                  setHoveredBar({ date: d.date, minutes: d.studyMinutes, x: x + barWidth / 2, y })
                }
                onMouseLeave={() => setHoveredBar(null)}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${d.date}: ${d.studyMinutes} minutes`}
              />
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  className="chart-axis-text"
                >
                  {displayDay}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip Overlay */}
        {hoveredBar && (
          <g transform={`translate(${hoveredBar.x}, ${Math.max(25, hoveredBar.y - 15)})`}>
            <rect
              x="-45"
              y="-22"
              width="90"
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
              {hoveredBar.date}: {hoveredBar.minutes}m
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
