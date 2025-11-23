"use client";

import { useMemo, useState, useRef } from "react";

interface Match {
  date: string;
}

interface ActivityHeatmapProps {
  matches: Match[];
}

interface DayData {
  date: Date;
  count: number;
  dateString: string;
  weekIndex?: number;
  dayIndex?: number;
}

export default function ActivityHeatmap({ matches }: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to get date string in local timezone (YYYY-MM-DD)
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Calculate activity by day
  const activityByDay = useMemo(() => {
    const activity: Record<string, number> = {};

    matches.forEach((match) => {
      // Extract date part (YYYY-MM-DD) from timestamp using local timezone
      const date = new Date(match.date);
      const dateString = getLocalDateString(date);
      activity[dateString] = (activity[dateString] || 0) + 1;
    });

    return activity;
  }, [matches]);

  // Generate last 365 days
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysArray: DayData[] = [];

    // Generate last 365 days
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = getLocalDateString(date);
      const count = activityByDay[dateString] || 0;

      daysArray.push({
        date,
        count,
        dateString,
      });
    }

    return daysArray;
  }, [activityByDay]);

  // Calculate max count for color intensity
  const maxCount = useMemo(() => {
    return Math.max(...days.map((d) => d.count), 1);
  }, [days]);

  // Get color based on count
  const getColor = (count: number): string => {
    if (count === 0) return "bg-gray-100";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "bg-blue-200";
    if (intensity < 0.5) return "bg-blue-400";
    if (intensity < 0.75) return "bg-blue-600";
    return "bg-blue-800";
  };

  // Group days by weeks (53 weeks for 365 days) - starting from Monday
  const weeks = useMemo(() => {
    const weeksArray: DayData[][] = [];
    let currentWeek: DayData[] = [];

    // Find the first Monday before or on the first day
    const firstDay = days[0];
    let firstDayOfWeek = firstDay.date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Convert to Monday-based week: Monday = 0, Tuesday = 1, ..., Sunday = 6
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Add empty days at the beginning to align with Monday
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDate = new Date(firstDay.date);
      emptyDate.setDate(emptyDate.getDate() - (firstDayOfWeek - i));
      currentWeek.push({
        date: emptyDate,
        count: 0,
        dateString: "",
      });
    }

    days.forEach((day) => {
      currentWeek.push(day);

      // If we've completed a week (7 days), start a new one
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    // Add week indices to days for tooltip positioning
    weeksArray.forEach((week, weekIdx) => {
      week.forEach((day, dayIdx) => {
        day.weekIndex = weekIdx;
        day.dayIndex = dayIdx;
      });
    });

    // Add the last week if it has any days
    if (currentWeek.length > 0) {
      // Fill remaining days with empty placeholders
      while (currentWeek.length < 7) {
        const lastDay = currentWeek[currentWeek.length - 1];
        const nextDay = new Date(lastDay.date);
        nextDay.setDate(nextDay.getDate() + 1);
        currentWeek.push({
          date: nextDay,
          count: 0,
          dateString: "",
        });
      }
      weeksArray.push(currentWeek);
    }

    return weeksArray;
  }, [days]);

  // Format date for tooltip
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format date short for tooltip
  const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    const seenMonths = new Set<string>();

    weeks.forEach((week, weekIndex) => {
      // Find first non-empty day in week
      const firstDay = week.find((d) => d.dateString);
      if (firstDay) {
        const month = firstDay.date.toLocaleDateString("en-US", {
          month: "short",
        });
        const monthKey = `${firstDay.date.getFullYear()}-${month}`;

        // Only add label if it's the first week of the month or we haven't seen this month
        if (firstDay.date.getDate() <= 7 && !seenMonths.has(monthKey)) {
          labels.push({ month, weekIndex });
          seenMonths.add(monthKey);
        }
      }
    });

    return labels;
  }, [weeks]);

  // Calculate total matches count
  const totalMatches = useMemo(() => {
    return matches.length;
  }, [matches]);

  return (
    <div ref={containerRef} className="w-full relative overflow-y-hidden">
      {/* Total matches count */}
      <div className="mb-2 text-sm text-gray-600">
        <strong className="font-semibold text-gray-900">{totalMatches}</strong>{" "}
        matches in the last year
      </div>

      <div className="flex items-start gap-2 overflow-x-auto overflow-y-hidden py-2">
        {/* Left column: Only day labels */}
        <div className="shrink-0">
          {/* Empty space for month labels */}
          <div className="h-4 mb-0.5"></div>
          {/* Day labels - all days of the week starting from Monday */}
          <div className="flex flex-col gap-0.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (day, idx) => (
                <div
                  key={idx}
                  className="h-3.5 text-xs text-gray-500 text-right pr-2 flex items-center justify-end"
                  style={{ lineHeight: "14px", minHeight: "14px" }}
                >
                  {day}
                </div>
              )
            )}
          </div>
        </div>

        {/* Heatmap grid with month labels on top */}
        <div className="shrink-0 relative">
          {/* Month labels - positioned above the grid using same flex layout */}
          <div className="flex gap-0.5 mb-0.5" style={{ height: "16px" }}>
            {weeks.map((week, weekIndex) => {
              // Check if this week should have a month label
              const monthLabel = monthLabels.find(
                (label) => label.weekIndex === weekIndex
              );

              return (
                <div
                  key={weekIndex}
                  className="w-3.5 flex items-start shrink-0"
                >
                  {monthLabel && (
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      {monthLabel.month}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-0.5">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5 shrink-0">
                {week.map((day, dayIndex) => {
                  const isEmpty = !day.dateString;

                  if (isEmpty) {
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className="w-3.5 h-3.5 rounded-sm bg-transparent shrink-0"
                        style={{ minHeight: "14px", minWidth: "14px" }}
                      />
                    );
                  }

                  const updateTooltipPosition = (
                    e:
                      | React.MouseEvent<HTMLDivElement>
                      | React.TouchEvent<HTMLDivElement>
                  ) => {
                    if (containerRef.current) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const containerRect =
                        containerRef.current.getBoundingClientRect();
                      const tooltipWidth = 200; // Approximate tooltip width
                      const tooltipHeight = 60; // Approximate tooltip height
                      const offset = 8; // Offset from element
                      const containerWidth = containerRect.width;

                      // Calculate x position, ensuring tooltip doesn't go off edges
                      let x = rect.left - containerRect.left + rect.width / 2;
                      // Check left edge
                      if (x < tooltipWidth / 2) {
                        x = tooltipWidth / 2;
                      }
                      // Check right edge
                      if (x + tooltipWidth / 2 > containerWidth) {
                        x = containerWidth - tooltipWidth / 2;
                      }

                      // Calculate y position, ensuring tooltip doesn't go off bottom
                      let y = rect.top - containerRect.top - offset;
                      if (y < tooltipHeight + offset) {
                        // If tooltip would go above, position it below instead
                        y = rect.bottom - containerRect.top + offset;
                      } else {
                        // Position above element
                        y =
                          rect.top - containerRect.top - tooltipHeight - offset;
                      }

                      setTooltipPosition({ x, y });
                    }
                  };

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-3.5 h-3.5 rounded-sm ${getColor(
                        day.count
                      )} transition-all hover:ring-1 hover:ring-blue-400 hover:ring-offset-1 cursor-pointer relative shrink-0 touch-none`}
                      style={{ minHeight: "14px", minWidth: "14px" }}
                      onMouseEnter={(e) => {
                        setHoveredDay(day);
                        updateTooltipPosition(e);
                      }}
                      onMouseMove={(e) => {
                        if (hoveredDay) {
                          updateTooltipPosition(e);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredDay(null);
                        setTooltipPosition(null);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (hoveredDay?.dateString === day.dateString) {
                          // Toggle tooltip on click for mobile
                          setHoveredDay(null);
                          setTooltipPosition(null);
                        } else {
                          setHoveredDay(day);
                          updateTooltipPosition(e);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoveredDay(day);
                        updateTooltipPosition(e);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend - aligned to the right edge of heatmap */}
          <div className="flex items-center justify-end mt-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-200"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-400"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-800"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip - positioned near hovered element */}
      {hoveredDay && tooltipPosition && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg whitespace-nowrap z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold mb-1">
            {hoveredDay.count > 0 ? (
              <>
                {hoveredDay.count}{" "}
                {hoveredDay.count === 1 ? "match" : "matches"}
              </>
            ) : (
              "No matches"
            )}
          </div>
          <div className="text-gray-300">
            {hoveredDay.date.toLocaleDateString("en-US", { weekday: "long" })},{" "}
            {formatDateShort(hoveredDay.date)}
          </div>
          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 top-full -translate-x-1/2"
            style={{
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #111827",
            }}
          />
        </div>
      )}
    </div>
  );
}
