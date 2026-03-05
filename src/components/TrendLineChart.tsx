import React, { useMemo, useRef, useState } from 'react';
import { DashboardTimeseriesResponse } from '../types';

type Pillar = 'design' | 'code' | 'content';

type SeriesByPillar = DashboardTimeseriesResponse['series'];

interface TrendLineChartProps {
  timeseries: DashboardTimeseriesResponse | null;
  activePillars: Pillar[];
}

const SVG_WIDTH = 960;
const SVG_HEIGHT = 320;
const MARGIN = {
  top: 20,
  right: 20,
  bottom: 42,
  left: 52,
};

const PILLAR_ORDER: Pillar[] = ['design', 'code', 'content'];

const PILLAR_CONFIG: Record<Pillar, { label: string; color: string }> = {
  design: {
    label: 'Design',
    color: '#e60000',
  },
  code: {
    label: 'Code',
    color: '#0d0d0d',
  },
  content: {
    label: 'Content',
    color: '#0096ad',
  },
};

const EMPTY_SERIES: SeriesByPillar = {
  design: [],
  code: [],
  content: [],
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const formatDayLabel = (day: string): string => {
  const date = new Date(`${day}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const formatDayWithWeekday = (day: string): string => {
  const date = new Date(`${day}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatRawValue = (value: number | null): string => {
  if (value === null) return 'n/a';
  return value.toLocaleString();
};

const normalizeSeries = (values: Array<number | null>): Array<number | null> => {
  const baseline = values.find((value) => value !== null);

  if (baseline === undefined) {
    return values.map(() => null);
  }

  if (baseline === 0) {
    return values.map((value) => {
      if (value === null) return null;
      return value === 0 ? 100 : null;
    });
  }

  return values.map((value) => (value === null ? null : (value / baseline) * 100));
};

const getTickIndices = (pointCount: number): number[] => {
  if (pointCount <= 0) return [];

  const step = pointCount <= 8
    ? 1
    : pointCount <= 14
      ? 2
      : pointCount <= 31
        ? 5
        : pointCount <= 93
          ? 14
          : 30;

  const ticks: number[] = [];
  for (let index = 0; index < pointCount; index += step) {
    ticks.push(index);
  }

  if (ticks[ticks.length - 1] !== pointCount - 1) {
    ticks.push(pointCount - 1);
  }

  return ticks;
};

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ timeseries, activePillars }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const days = timeseries?.days ?? [];
  const series = timeseries?.series ?? EMPTY_SERIES;

  const visiblePillars = PILLAR_ORDER.filter((pillar) => activePillars.includes(pillar));

  const normalizedSeries = useMemo<Record<Pillar, Array<number | null>>>(() => ({
    design: normalizeSeries(series.design),
    code: normalizeSeries(series.code),
    content: normalizeSeries(series.content),
  }), [series]);

  const hasDataByPillar = useMemo<Record<Pillar, boolean>>(() => ({
    design: normalizedSeries.design.some((value) => value !== null),
    code: normalizedSeries.code.some((value) => value !== null),
    content: normalizedSeries.content.some((value) => value !== null),
  }), [normalizedSeries]);

  const plottedPillars = visiblePillars.filter((pillar) => hasDataByPillar[pillar]);

  const normalizedValues = plottedPillars.flatMap((pillar) =>
    normalizedSeries[pillar].filter((value): value is number => value !== null)
  );

  const hasAnyHistoricalData = normalizedValues.length > 0;

  const plotWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

  const minValue = hasAnyHistoricalData ? Math.min(...normalizedValues) : 0;
  const maxValue = hasAnyHistoricalData ? Math.max(...normalizedValues) : 100;
  const spread = maxValue - minValue;
  const padding = spread === 0 ? Math.max(5, maxValue * 0.08) : spread * 0.15;
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;
  const yRange = yMax - yMin || 1;

  const xForIndex = (index: number): number => {
    if (days.length <= 1) {
      return MARGIN.left + (plotWidth / 2);
    }

    return MARGIN.left + ((index / (days.length - 1)) * plotWidth);
  };

  const yForValue = (value: number): number => MARGIN.top + (((yMax - value) / yRange) * plotHeight);

  const buildPath = (values: Array<number | null>): string => {
    let path = '';
    let hasActiveSegment = false;

    values.forEach((value, index) => {
      if (value === null) {
        hasActiveSegment = false;
        return;
      }

      const x = xForIndex(index).toFixed(2);
      const y = yForValue(value).toFixed(2);

      if (!hasActiveSegment) {
        path += `M ${x} ${y}`;
        hasActiveSegment = true;
        return;
      }

      path += ` L ${x} ${y}`;
    });

    return path;
  };

  const xTickIndices = getTickIndices(days.length);
  const yTicks = Array.from({ length: 5 }, (_, index) => yMax - ((index / 4) * yRange));

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (days.length === 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    const bounds = svg.getBoundingClientRect();
    const xInSvg = ((event.clientX - bounds.left) / bounds.width) * SVG_WIDTH;
    const clampedX = clamp(xInSvg, MARGIN.left, MARGIN.left + plotWidth);

    const index = days.length === 1
      ? 0
      : Math.round(((clampedX - MARGIN.left) / plotWidth) * (days.length - 1));

    setHoveredIndex(clamp(index, 0, days.length - 1));
  };

  const hoveredLabel = hoveredIndex !== null && days[hoveredIndex]
    ? formatDayWithWeekday(days[hoveredIndex])
    : null;

  const hoveredX = hoveredIndex !== null ? xForIndex(hoveredIndex) : null;

  if (days.length === 0) {
    return (
      <div className="rounded-sm border border-semantic-borderSubtle bg-semantic-backgroundNeutral p-spacing-20 text-sm text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-95 dark:text-neutral-25">
        No historical trend data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-spacing-16">
      <div className="flex flex-wrap items-center gap-spacing-12">
        {visiblePillars.map((pillar) => {
          const pillarConfig = PILLAR_CONFIG[pillar];
          const hasData = hasDataByPillar[pillar];

          return (
            <div
              key={pillar}
              className={`inline-flex items-center gap-spacing-8 rounded-tokenFull border px-spacing-12 py-spacing-4 text-xs font-semibold uppercase tracking-wide ${
                hasData
                  ? 'border-semantic-borderSubtle text-semantic-textNeutral dark:border-neutral-50/70 dark:text-neutral-5'
                  : 'border-semantic-borderSubtle/70 text-neutral-60 dark:border-neutral-50/50 dark:text-neutral-25'
              }`}
            >
              <span
                className="inline-block h-spacing-8 w-spacing-8 rounded-tokenFull"
                style={{ backgroundColor: pillarConfig.color, opacity: hasData ? 1 : 0.35 }}
              />
              <span>{pillarConfig.label}</span>
              {!hasData && <span className="normal-case">(no data)</span>}
            </div>
          );
        })}
      </div>

      {!hasAnyHistoricalData ? (
        <div className="rounded-sm border border-semantic-borderSubtle bg-semantic-backgroundNeutral p-spacing-20 text-sm text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-95 dark:text-neutral-25">
          No historical trend points found for the selected period.
        </div>
      ) : (
        <div className="relative rounded-sm border border-semantic-borderSubtle bg-semantic-backgroundNeutral p-spacing-12 dark:border-neutral-50/70 dark:bg-neutral-95">
          {hoveredLabel && hoveredIndex !== null && (
            <div className="pointer-events-none absolute right-spacing-12 top-spacing-12 z-10 rounded-sm border border-semantic-borderSubtle bg-semantic-backgroundNeutral px-spacing-12 py-spacing-8 text-xs shadow-tokenShadow28 dark:border-neutral-50/70 dark:bg-neutral-85">
              <div className="mb-spacing-4 font-semibold text-semantic-textNeutral dark:text-neutral-5">{hoveredLabel}</div>
              <div className="space-y-spacing-4">
                {visiblePillars.map((pillar) => {
                  const rawValue = series[pillar][hoveredIndex] ?? null;
                  const indexedValue = normalizedSeries[pillar][hoveredIndex] ?? null;
                  const pillarConfig = PILLAR_CONFIG[pillar];

                  return (
                    <div key={pillar} className="flex items-center gap-spacing-8 text-neutral-60 dark:text-neutral-25">
                      <span className="inline-block h-spacing-8 w-spacing-8 rounded-tokenFull" style={{ backgroundColor: pillarConfig.color }} />
                      <span className="font-medium text-semantic-textNeutral dark:text-neutral-5">{pillarConfig.label}</span>
                      <span>Index {indexedValue !== null ? indexedValue.toFixed(1) : 'n/a'}</span>
                      <span>Raw {formatRawValue(rawValue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="h-[260px] w-full"
            role="img"
            aria-label="Normalized trend chart for dashboard adoption metrics"
          >
            {yTicks.map((tickValue) => {
              const y = yForValue(tickValue);
              return (
                <g key={tickValue}>
                  <line
                    x1={MARGIN.left}
                    x2={MARGIN.left + plotWidth}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth={1}
                    opacity={0.12}
                  />
                  <text
                    x={MARGIN.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={12}
                    fill="currentColor"
                    opacity={0.75}
                  >
                    {tickValue.toFixed(0)}
                  </text>
                </g>
              );
            })}

            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={MARGIN.top + plotHeight}
              y2={MARGIN.top + plotHeight}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.22}
            />

            {xTickIndices.map((index) => {
              const x = xForIndex(index);
              return (
                <text
                  key={days[index]}
                  x={x}
                  y={MARGIN.top + plotHeight + 18}
                  textAnchor="middle"
                  fontSize={12}
                  fill="currentColor"
                  opacity={0.75}
                >
                  {formatDayLabel(days[index])}
                </text>
              );
            })}

            {hoveredX !== null && (
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1={MARGIN.top}
                y2={MARGIN.top + plotHeight}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.35}
              />
            )}

            {plottedPillars.map((pillar) => {
              const values = normalizedSeries[pillar];
              const path = buildPath(values);
              if (!path) return null;

              return (
                <path
                  key={pillar}
                  d={path}
                  fill="none"
                  stroke={PILLAR_CONFIG[pillar].color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {hoveredIndex !== null && plottedPillars.map((pillar) => {
              const value = normalizedSeries[pillar][hoveredIndex];
              if (value === null) return null;

              return (
                <circle
                  key={`point-${pillar}-${hoveredIndex}`}
                  cx={xForIndex(hoveredIndex)}
                  cy={yForValue(value)}
                  r={4.5}
                  fill={PILLAR_CONFIG[pillar].color}
                  stroke="#ffffff"
                  strokeWidth={1.8}
                />
              );
            })}

            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </svg>

          <div className="mt-spacing-4 text-right text-xs font-medium uppercase tracking-wide text-neutral-60 dark:text-neutral-25">
            Index scale (first available day = 100)
          </div>
        </div>
      )}
    </div>
  );
};
