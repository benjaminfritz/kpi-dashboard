import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardTimeseriesResponse } from '../types';

type Pillar = 'design' | 'code' | 'content';

type SeriesByPillar = DashboardTimeseriesResponse['series'];

interface TrendLineChartProps {
  timeseries: DashboardTimeseriesResponse | null;
  activePillars: Pillar[];
  darkMode: boolean;
  displayMode: 'normalized' | 'raw';
  showLegend?: boolean;
}

const DEFAULT_SVG_WIDTH = 960;
const SVG_HEIGHT_DESKTOP = 320;
const SVG_HEIGHT_MOBILE = 300;
const MARGIN_DESKTOP = {
  top: 20,
  right: 20,
  bottom: 42,
  left: 52,
};
const MARGIN_MOBILE = {
  top: 16,
  right: 10,
  bottom: 48,
  left: 40,
};

const PILLAR_ORDER: Pillar[] = ['design', 'code', 'content'];

const PILLAR_CONFIG_BASE: Record<Pillar, { label: string; color: string }> = {
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

const formatYAxisTickValue = (value: number, displayMode: 'normalized' | 'raw'): string => (
  displayMode === 'normalized' ? value.toFixed(0) : Math.round(value).toLocaleString()
);

const normalizeSeries = (values: Array<number | null>): Array<number | null> => {
  const baseline = values.find((value) => value !== null);

  if (baseline === undefined) {
    return values.map(() => null);
  }

  if (baseline === 0) {
    const nonZeroBaseline = values.find((value): value is number => value !== null && value !== 0);

    // All available values are zero: render a stable flat line instead of dropping the series.
    if (nonZeroBaseline === undefined) {
      return values.map((value) => (value === null ? null : 100));
    }

    // Baseline starts at zero: keep zeros at 0 and normalize positive values
    // against the first non-zero point so the trend remains visible.
    return values.map((value) => {
      if (value === null) return null;
      if (value === 0) return 0;
      return (value / nonZeroBaseline) * 100;
    });
  }

  return values.map((value) => (value === null ? null : (value / baseline) * 100));
};

const getTickIndices = (pointCount: number, maxTickCount: number): number[] => {
  if (pointCount <= 0) return [];
  if (pointCount === 1) return [0];

  const boundedMaxTickCount = Math.max(2, Math.min(pointCount, maxTickCount));
  const step = Math.max(1, Math.ceil((pointCount - 1) / (boundedMaxTickCount - 1)));

  const ticks: number[] = [];
  for (let index = 0; index < pointCount; index += step) {
    ticks.push(index);
  }

  if (ticks[ticks.length - 1] !== pointCount - 1) {
    ticks.push(pointCount - 1);
  }

  return ticks;
};

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  timeseries,
  activePillars,
  darkMode,
  displayMode,
  showLegend = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(DEFAULT_SVG_WIDTH);

  const days = timeseries?.days ?? [];
  const series = timeseries?.series ?? EMPTY_SERIES;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateWidth = () => {
      const measuredWidth = Math.floor(wrapper.getBoundingClientRect().width);
      if (measuredWidth > 0) {
        setChartWidth(measuredWidth);
      }
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, []);

  const pillarConfig: Record<Pillar, { label: string; color: string }> = {
    ...PILLAR_CONFIG_BASE,
    code: {
      ...PILLAR_CONFIG_BASE.code,
      color: darkMode ? '#bebebe' : '#0d0d0d',
    },
  };

  const visiblePillars = PILLAR_ORDER.filter((pillar) => activePillars.includes(pillar));

  const normalizedSeries = useMemo<Record<Pillar, Array<number | null>>>(() => ({
    design: normalizeSeries(series.design),
    code: normalizeSeries(series.code),
    content: normalizeSeries(series.content),
  }), [series]);

  const displayedSeries = useMemo<Record<Pillar, Array<number | null>>>(() => (
    displayMode === 'normalized'
      ? normalizedSeries
      : {
        design: series.design,
        code: series.code,
        content: series.content,
      }
  ), [displayMode, normalizedSeries, series]);

  const hasDataByPillar = useMemo<Record<Pillar, boolean>>(() => ({
    design: displayedSeries.design.some((value) => value !== null),
    code: displayedSeries.code.some((value) => value !== null),
    content: displayedSeries.content.some((value) => value !== null),
  }), [displayedSeries]);

  const plottedPillars = visiblePillars.filter((pillar) => hasDataByPillar[pillar]);

  const displayedValues = plottedPillars.flatMap((pillar) =>
    displayedSeries[pillar].filter((value): value is number => value !== null)
  );

  const hasAnyHistoricalData = displayedValues.length > 0;

  const minValue = hasAnyHistoricalData ? Math.min(...displayedValues) : 0;
  const maxValue = hasAnyHistoricalData ? Math.max(...displayedValues) : 100;
  const spread = maxValue - minValue;
  const padding = spread === 0 ? Math.max(5, maxValue * 0.08) : spread * 0.15;
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;
  const yRange = yMax - yMin || 1;
  const yTicks = Array.from({ length: 5 }, (_, index) => yMax - ((index / 4) * yRange));

  const isCompactWidth = chartWidth < 640;
  const baseMargin = isCompactWidth ? MARGIN_MOBILE : MARGIN_DESKTOP;
  const longestYAxisLabelLength = yTicks.reduce((maxLength, tickValue) => (
    Math.max(maxLength, formatYAxisTickValue(tickValue, displayMode).length)
  ), 0);
  const margin = {
    ...baseMargin,
    left: Math.max(baseMargin.left, (longestYAxisLabelLength * 7) + 14),
  };
  const chartHeight = isCompactWidth ? SVG_HEIGHT_MOBILE : SVG_HEIGHT_DESKTOP;
  const plotWidth = Math.max(1, chartWidth - margin.left - margin.right);
  const plotHeight = Math.max(1, chartHeight - margin.top - margin.bottom);

  const xForIndex = (index: number): number => {
    if (days.length <= 1) {
      return margin.left + (plotWidth / 2);
    }

    return margin.left + ((index / (days.length - 1)) * plotWidth);
  };

  const yForValue = (value: number): number => margin.top + (((yMax - value) / yRange) * plotHeight);

  const buildPath = (values: Array<number | null>): string => {
    let path = '';

    values.forEach((value, index) => {
      if (value === null) return;

      const x = xForIndex(index).toFixed(2);
      const y = yForValue(value).toFixed(2);

      if (!path) {
        path += `M ${x} ${y}`;
        return;
      }

      path += ` L ${x} ${y}`;
    });

    return path;
  };

  const xTickIndices = useMemo(() => {
    if (days.length <= 0) return [];
    if (isCompactWidth && chartWidth < 420) {
      if (days.length === 1) return [0];
      const middleIndex = Math.floor((days.length - 1) / 2);
      return Array.from(new Set([0, middleIndex, days.length - 1]));
    }

    return getTickIndices(days.length, Math.max(3, Math.floor(plotWidth / 72)));
  }, [chartWidth, days.length, isCompactWidth, plotWidth]);
  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (days.length === 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    const bounds = svg.getBoundingClientRect();
    const xInSvg = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
    const clampedX = clamp(xInSvg, margin.left, margin.left + plotWidth);

    const index = days.length === 1
      ? 0
      : Math.round(((clampedX - margin.left) / plotWidth) * (days.length - 1));

    setHoveredIndex(clamp(index, 0, days.length - 1));
  };

  const hoveredLabel = hoveredIndex !== null && days[hoveredIndex]
    ? formatDayWithWeekday(days[hoveredIndex])
    : null;

  const hoveredX = hoveredIndex !== null ? xForIndex(hoveredIndex) : null;
  const ariaLabel = plottedPillars.length === 1
    ? `${pillarConfig[plottedPillars[0]].label} trend chart`
    : 'Trend chart for dashboard adoption metrics';

  if (days.length === 0) {
    return (
      <div className="rounded-sm border border-semantic-borderSubtle bg-semantic-backgroundNeutral p-spacing-20 text-sm text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-95 dark:text-neutral-25">
        No historical trend data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-spacing-16">
      {showLegend && (
        <div className="flex flex-wrap items-center gap-spacing-12">
          {visiblePillars.map((pillar) => {
            const pillarConfigEntry = pillarConfig[pillar];
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
                  style={{ backgroundColor: pillarConfigEntry.color, opacity: hasData ? 1 : 0.35 }}
                />
                <span>{pillarConfigEntry.label}</span>
                {!hasData && <span className="normal-case">(no data)</span>}
              </div>
            );
          })}
        </div>
      )}

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
                {visiblePillars.every((pillar) => series[pillar][hoveredIndex] === null || series[pillar][hoveredIndex] === undefined) ? (
                  <div className="text-neutral-60 dark:text-neutral-25">No snapshot stored for this day.</div>
                ) : (
                  visiblePillars.map((pillar) => {
                    const rawValue = series[pillar][hoveredIndex] ?? null;
                    const indexedValue = normalizedSeries[pillar][hoveredIndex] ?? null;
                    const displayedValue = displayedSeries[pillar][hoveredIndex] ?? null;
                    const pillarConfigEntry = pillarConfig[pillar];

                    return (
                      <div key={pillar} className="flex items-center gap-spacing-8 text-neutral-60 dark:text-neutral-25">
                        <span className="inline-block h-spacing-8 w-spacing-8 rounded-tokenFull" style={{ backgroundColor: pillarConfigEntry.color }} />
                        <span className="font-medium text-semantic-textNeutral dark:text-neutral-5">{pillarConfigEntry.label}</span>
                        {displayMode === 'normalized' ? (
                          <>
                            <span>Index {indexedValue !== null ? indexedValue.toFixed(1) : 'n/a'}</span>
                            <span>Raw {formatRawValue(rawValue)}</span>
                          </>
                        ) : (
                          <span>{formatRawValue(displayedValue)}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div ref={wrapperRef} className="w-full overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width={chartWidth}
              height={chartHeight}
              className="block"
              role="img"
              aria-label={ariaLabel}
            >
            {yTicks.map((tickValue) => {
              const y = yForValue(tickValue);
              return (
                <g key={tickValue}>
                  <line
                    x1={margin.left}
                    x2={margin.left + plotWidth}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth={1}
                    opacity={0.12}
                  />
                  <text
                    x={margin.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                  fontSize={12}
                  fill="currentColor"
                  opacity={0.75}
                >
                    {formatYAxisTickValue(tickValue, displayMode)}
                  </text>
                </g>
              );
            })}

            <line
              x1={margin.left}
              x2={margin.left + plotWidth}
              y1={margin.top + plotHeight}
              y2={margin.top + plotHeight}
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
                  y={margin.top + plotHeight + 18}
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
                y1={margin.top}
                y2={margin.top + plotHeight}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.35}
              />
            )}

            {plottedPillars.map((pillar) => {
              const values = displayedSeries[pillar];
              const path = buildPath(values);
              if (!path) return null;

              return (
                <path
                  key={pillar}
                  d={path}
                  fill="none"
                  stroke={pillarConfig[pillar].color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {hoveredIndex !== null && plottedPillars.map((pillar) => {
              const value = displayedSeries[pillar][hoveredIndex];
              if (value === null) return null;

              return (
                <circle
                  key={`point-${pillar}-${hoveredIndex}`}
                  cx={xForIndex(hoveredIndex)}
                  cy={yForValue(value)}
                  r={4.5}
                  fill={pillarConfig[pillar].color}
                  stroke="#ffffff"
                  strokeWidth={1.8}
                />
              );
            })}

            <rect
              x={margin.left}
              y={margin.top}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            </svg>
          </div>

          <div className="mt-spacing-4 text-right text-xs font-medium uppercase tracking-wide text-neutral-60 dark:text-neutral-25">
            {displayMode === 'normalized'
              ? 'Index scale (first available day = 100)'
              : 'Raw metric values'}
          </div>
        </div>
      )}
    </div>
  );
};
