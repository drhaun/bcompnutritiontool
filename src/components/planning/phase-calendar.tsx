'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn,
  ZoomOut,
  CalendarDays,
  Target,
  TrendingDown,
  TrendingUp,
  Scale,
  Zap,
  Heart,
  Flag,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Phase, GoalType, TimelineEvent } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const GOAL_COLORS: Record<GoalType, { bg: string; border: string; gradient: string; glow: string; icon: React.ReactNode }> = {
  fat_loss: { 
    bg: 'bg-orange-500', 
    border: 'border-orange-400/60',
    gradient: 'bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600',
    glow: 'shadow-orange-500/30',
    icon: <TrendingDown className="h-3 w-3" />
  },
  muscle_gain: { 
    bg: 'bg-blue-500', 
    border: 'border-blue-400/60',
    gradient: 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/30',
    icon: <TrendingUp className="h-3 w-3" />
  },
  recomposition: { 
    bg: 'bg-violet-500', 
    border: 'border-violet-400/60',
    gradient: 'bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600',
    glow: 'shadow-violet-500/30',
    icon: <Scale className="h-3 w-3" />
  },
  performance: { 
    bg: 'bg-emerald-500', 
    border: 'border-emerald-400/60',
    gradient: 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600',
    glow: 'shadow-emerald-500/30',
    icon: <Zap className="h-3 w-3" />
  },
  health: { 
    bg: 'bg-rose-500', 
    border: 'border-rose-400/60',
    gradient: 'bg-gradient-to-br from-rose-400 via-pink-500 to-red-600',
    glow: 'shadow-rose-500/30',
    icon: <Heart className="h-3 w-3" />
  },
  other: { 
    bg: 'bg-slate-500', 
    border: 'border-slate-400/60',
    gradient: 'bg-gradient-to-br from-slate-400 via-slate-500 to-gray-600',
    glow: 'shadow-slate-500/30',
    icon: <Target className="h-3 w-3" />
  },
};

const GOAL_LABELS: Record<GoalType, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  recomposition: 'Recomp',
  performance: 'Performance',
  health: 'Health',
  other: 'Custom',
};

const EVENT_COLORS: Record<string, string> = {
  lab_test: 'bg-cyan-400',
  competition: 'bg-yellow-400',
  travel: 'bg-sky-400',
  vacation: 'bg-teal-400',
  milestone: 'bg-amber-400',
  other: 'bg-gray-400',
};

type ViewLevel = 'year' | 'quarter' | 'month';

interface PhaseCalendarProps {
  phases: Phase[];
  activePhaseId?: string | null;
  year?: number;
  onPhaseClick?: (phase: Phase) => void;
  timelineEvents?: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  onEventDelete?: (eventId: string) => void;
}

export function PhaseCalendar({
  phases,
  activePhaseId,
  year: initialYear,
  onPhaseClick,
  timelineEvents = [],
  onEventClick,
  onEventDelete,
}: PhaseCalendarProps) {
  const [year, setYear] = useState(initialYear || new Date().getFullYear());
  const [viewLevel, setViewLevel] = useState<ViewLevel>('year');
  const [focusedQuarter, setFocusedQuarter] = useState<number | null>(null);
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [selectedPhaseForDetail, setSelectedPhaseForDetail] = useState<Phase | null>(null);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();
  
  // Get visible date range based on view level
  const dateRange = useMemo(() => {
    if (viewLevel === 'month' && focusedMonth !== null) {
      return {
        start: new Date(year, focusedMonth, 1),
        end: new Date(year, focusedMonth + 1, 0),
        label: `${FULL_MONTHS[focusedMonth]} ${year}`,
      };
    }
    if (viewLevel === 'quarter' && focusedQuarter !== null) {
      const startMonth = focusedQuarter * 3;
      return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 3, 0),
        label: `Q${focusedQuarter + 1} ${year}`,
      };
    }
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
      label: `${year}`,
    };
  }, [year, viewLevel, focusedQuarter, focusedMonth]);
  
  // Calculate phase positions based on current view
  const phasePositions = useMemo(() => {
    const { start: rangeStart, end: rangeEnd } = dateRange;
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
    
    return phases
      .filter(phase => {
        const phaseStart = new Date(phase.startDate);
        const phaseEnd = new Date(phase.endDate);
        return !(phaseEnd < rangeStart || phaseStart > rangeEnd);
      })
      .map(phase => {
        const phaseStart = new Date(phase.startDate);
        const phaseEnd = new Date(phase.endDate);
        
        // Clamp to visible range
        const displayStart = phaseStart < rangeStart ? rangeStart : phaseStart;
        const displayEnd = phaseEnd > rangeEnd ? rangeEnd : phaseEnd;
        
        const startDays = (displayStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
        const endDays = (displayEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
        
        const left = (startDays / totalDays) * 100;
        const width = ((endDays - startDays) / totalDays) * 100;
        
        // Calculate actual duration
        const durationDays = Math.round((phaseEnd.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24));
        const durationWeeks = Math.round(durationDays / 7);
        
        // Is this phase clipped at start or end?
        const clippedStart = phaseStart < rangeStart;
        const clippedEnd = phaseEnd > rangeEnd;
        
        return {
          phase,
          left: `${left}%`,
          width: `${Math.max(width, 2)}%`,
          durationDays,
          durationWeeks,
          clippedStart,
          clippedEnd,
          startFormatted: phaseStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          endFormatted: phaseEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });
  }, [phases, dateRange]);
  
  // Calculate event positions
  const eventPositions = useMemo(() => {
    const { start: rangeStart, end: rangeEnd } = dateRange;
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
    
    return timelineEvents
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= rangeStart && eventDate <= rangeEnd;
      })
      .map(event => {
        const eventDate = new Date(event.date);
        const dayOffset = (eventDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
        const left = (dayOffset / totalDays) * 100;
        
        return {
          ...event,
          left: `${left}%`,
          dateFormatted: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });
  }, [timelineEvents, dateRange]);
  
  // Calculate today's position
  const todayPosition = useMemo(() => {
    const today = new Date();
    const { start: rangeStart, end: rangeEnd } = dateRange;
    
    if (today < rangeStart || today > rangeEnd) return null;
    
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
    const dayOffset = (today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    
    return (dayOffset / totalDays) * 100;
  }, [dateRange]);
  
  // Generate time markers based on view level
  const timeMarkers = useMemo(() => {
    if (viewLevel === 'month' && focusedMonth !== null) {
      // Show weeks within the month
      const daysInMonth = new Date(year, focusedMonth + 1, 0).getDate();
      const weeks = Math.ceil(daysInMonth / 7);
      return Array.from({ length: weeks }, (_, i) => ({
        label: `W${i + 1}`,
        position: (i / weeks) * 100,
        width: 100 / weeks,
      }));
    }
    if (viewLevel === 'quarter' && focusedQuarter !== null) {
      // Show months within the quarter
      const startMonth = focusedQuarter * 3;
      return [0, 1, 2].map(i => ({
        label: MONTHS[startMonth + i],
        position: (i / 3) * 100,
        width: 100 / 3,
        isCurrent: year === currentYear && startMonth + i === currentMonth,
      }));
    }
    // Year view - show months
    return MONTHS.map((month, i) => ({
      label: month,
      position: (i / 12) * 100,
      width: 100 / 12,
      isCurrent: year === currentYear && i === currentMonth,
    }));
  }, [viewLevel, focusedMonth, focusedQuarter, year, currentYear, currentMonth]);
  
  // Navigation handlers
  const handleZoomIn = () => {
    if (viewLevel === 'year') {
      // Find the quarter with the most phases, or default to current quarter
      const currentQ = Math.floor(currentMonth / 3);
      setFocusedQuarter(currentQ);
      setViewLevel('quarter');
    } else if (viewLevel === 'quarter' && focusedQuarter !== null) {
      const startMonth = focusedQuarter * 3;
      setFocusedMonth(startMonth);
      setViewLevel('month');
    }
  };
  
  const handleZoomOut = () => {
    if (viewLevel === 'month') {
      setViewLevel('quarter');
      setFocusedMonth(null);
    } else if (viewLevel === 'quarter') {
      setViewLevel('year');
      setFocusedQuarter(null);
    }
  };
  
  const handlePrev = () => {
    if (viewLevel === 'month' && focusedMonth !== null) {
      if (focusedMonth === 0) {
        setYear(y => y - 1);
        setFocusedMonth(11);
        setFocusedQuarter(3);
      } else {
        setFocusedMonth(m => (m || 0) - 1);
        setFocusedQuarter(Math.floor((focusedMonth - 1) / 3));
      }
    } else if (viewLevel === 'quarter' && focusedQuarter !== null) {
      if (focusedQuarter === 0) {
        setYear(y => y - 1);
        setFocusedQuarter(3);
      } else {
        setFocusedQuarter(q => (q || 0) - 1);
      }
    } else {
      setYear(y => y - 1);
    }
  };
  
  const handleNext = () => {
    if (viewLevel === 'month' && focusedMonth !== null) {
      if (focusedMonth === 11) {
        setYear(y => y + 1);
        setFocusedMonth(0);
        setFocusedQuarter(0);
      } else {
        setFocusedMonth(m => (m || 0) + 1);
        setFocusedQuarter(Math.floor((focusedMonth + 1) / 3));
      }
    } else if (viewLevel === 'quarter' && focusedQuarter !== null) {
      if (focusedQuarter === 3) {
        setYear(y => y + 1);
        setFocusedQuarter(0);
      } else {
        setFocusedQuarter(q => (q || 0) + 1);
      }
    } else {
      setYear(y => y + 1);
    }
  };
  
  const handleTimeMarkerClick = (index: number) => {
    if (viewLevel === 'year') {
      setFocusedQuarter(Math.floor(index / 3));
      setViewLevel('quarter');
    } else if (viewLevel === 'quarter' && focusedQuarter !== null) {
      setFocusedMonth(focusedQuarter * 3 + index);
      setViewLevel('month');
    }
  };
  
  const handlePhaseClick = (phase: Phase) => {
    if (selectedPhaseForDetail?.id === phase.id) {
      setSelectedPhaseForDetail(null);
      onPhaseClick?.(phase);
    } else {
      setSelectedPhaseForDetail(phase);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="min-w-[140px] text-center">
            <h3 className="font-semibold text-lg tracking-tight">
              {dateRange.label}
            </h3>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <div className="h-6 w-px bg-border mx-2" />
          
          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={handleZoomOut}
            disabled={viewLevel === 'year'}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={handleZoomIn}
            disabled={viewLevel === 'month'}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          {(viewLevel !== 'year' || year !== currentYear) && (
            <>
              <div className="h-6 w-px bg-border mx-2" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 hover:bg-[#c19962]/10 hover:text-[#c19962]"
                onClick={() => {
                  setYear(currentYear);
                  setViewLevel('year');
                  setFocusedQuarter(null);
                  setFocusedMonth(null);
                }}
              >
                <CalendarDays className="h-3 w-3 mr-1" />
                Today
              </Button>
            </>
          )}
        </div>
        
        {/* Legend */}
        <div className="hidden md:flex gap-2 text-[10px] font-medium">
          {(['fat_loss', 'muscle_gain', 'recomposition', 'performance', 'health'] as GoalType[]).map(goal => (
            <div key={goal} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
              <div className={cn("w-2 h-2 rounded-full", GOAL_COLORS[goal].bg)} />
              <span className="text-muted-foreground">{GOAL_LABELS[goal]}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Timeline Container */}
      <div className="relative rounded-xl border border-border/50 bg-gradient-to-b from-background to-muted/20 shadow-sm">
        {/* Time Headers */}
        <div className="flex border-b border-border/30 bg-muted/30">
          {timeMarkers.map((marker, i) => (
            <button
              key={i}
              className={cn(
                "flex-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide",
                "transition-colors hover:bg-muted/50 cursor-pointer",
                "border-r border-border/20 last:border-r-0",
                marker.isCurrent && "bg-[#c19962]/10 text-[#c19962] font-semibold",
                !marker.isCurrent && "text-muted-foreground"
              )}
              onClick={() => handleTimeMarkerClick(i)}
            >
              {marker.label}
            </button>
          ))}
        </div>
        
        {/* Quarter Labels (year view only) */}
        {viewLevel === 'year' && (
          <div className="absolute top-10 left-0 right-0 flex pointer-events-none">
            {[0, 1, 2, 3].map(q => (
              <div key={q} className="flex-1 flex items-center justify-center">
                <span className="text-[9px] font-mono text-muted-foreground/40 bg-background/80 px-1 rounded">
                  Q{q + 1}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Main Timeline */}
        <div className="relative h-32 px-2 py-4">
          {/* Vertical Grid Lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {timeMarkers.map((_, i) => (
              <div 
                key={i} 
                className="flex-1 border-r border-border/10 last:border-r-0"
              />
            ))}
          </div>
          
          {/* Phase Tracks */}
          <div className="relative h-full">
            {phasePositions.map(({ phase, left, width, durationWeeks, clippedStart, clippedEnd, startFormatted, endFormatted }) => {
              const colors = GOAL_COLORS[phase.goalType];
              const isHovered = hoveredPhase === phase.id;
              const isActive = phase.id === activePhaseId;
              const isSelected = selectedPhaseForDetail?.id === phase.id;
              
              return (
                <div
                  key={phase.id}
                  className={cn(
                    "absolute top-2 bottom-2 rounded-lg cursor-pointer",
                    "transition-all duration-300 ease-out",
                    colors.gradient,
                    colors.border,
                    "border shadow-lg",
                    isHovered && `scale-[1.02] shadow-xl ${colors.glow}`,
                    isActive && "ring-2 ring-[#c19962] ring-offset-2 ring-offset-background",
                    isSelected && "ring-2 ring-white/50",
                    phase.status === 'completed' && "opacity-60",
                    clippedStart && "rounded-l-none border-l-0",
                    clippedEnd && "rounded-r-none border-r-0"
                  )}
                  style={{ left, width, zIndex: isHovered || isSelected ? 20 : 10 }}
                  onClick={() => handlePhaseClick(phase)}
                  onMouseEnter={() => setHoveredPhase(phase.id)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  {/* Phase Content */}
                  <div className="h-full flex flex-col justify-center px-3 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/90">{colors.icon}</span>
                      <span className="text-xs text-white font-semibold truncate">
                        {phase.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/70 font-medium mt-0.5">
                      {durationWeeks}w • {startFormatted} - {endFormatted}
                    </div>
                  </div>
                  
                  {/* Clip indicators */}
                  {clippedStart && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/30 to-transparent" />
                  )}
                  {clippedEnd && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-black/30 to-transparent" />
                  )}
                </div>
              );
            })}
            
            {/* Event Markers */}
            {eventPositions.map((event) => (
              <div
                key={event.id}
                className="absolute top-0 bottom-0 z-30 group cursor-pointer"
                style={{ left: event.left }}
              >
                {/* Vertical line spanning full height */}
                <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-amber-400/60 group-hover:bg-amber-500 transition-colors" />
                
                {/* Top marker dot */}
                <div 
                  className={cn(
                    "absolute top-1 -translate-x-1/2 w-4 h-4 rounded-full",
                    "border-2 border-white shadow-lg",
                    "transition-all group-hover:scale-125 group-hover:shadow-xl",
                    EVENT_COLORS[event.type] || 'bg-gray-400'
                  )}
                />
                
                {/* Bottom marker triangle */}
                <div 
                  className={cn(
                    "absolute bottom-1 -translate-x-1/2 w-0 h-0",
                    "border-l-[6px] border-l-transparent",
                    "border-r-[6px] border-r-transparent",
                    "border-t-[8px]",
                    event.type === 'lab_test' ? 'border-t-cyan-400' :
                    event.type === 'competition' ? 'border-t-yellow-400' :
                    event.type === 'travel' ? 'border-t-sky-400' :
                    event.type === 'vacation' ? 'border-t-teal-400' :
                    event.type === 'milestone' ? 'border-t-amber-400' : 'border-t-gray-400'
                  )}
                />
                
                {/* Tooltip - shows on hover */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 pointer-events-none">
                  <div className="bg-popover border rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                    <div className="text-xs font-semibold">{event.name}</div>
                    <div className="text-[10px] text-muted-foreground">{event.dateFormatted}</div>
                  </div>
                </div>
                
                {/* Delete button on hover */}
                {onEventDelete && (
                  <button
                    className="absolute top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventDelete(event.id);
                    }}
                  >
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg mt-10">
                      <X className="h-3 w-3 text-white" />
                    </div>
                  </button>
                )}
              </div>
            ))}
            
            {/* Today Marker */}
            {todayPosition !== null && (
              <div 
                className="absolute top-0 bottom-0 z-40 pointer-events-none"
                style={{ left: `${todayPosition}%` }}
              >
                <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#c19962] via-[#c19962] to-transparent" />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <div className="w-3 h-3 rounded-full bg-[#c19962] border-2 border-background shadow-lg animate-pulse" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                  <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 bg-[#c19962]/10 border-[#c19962]/30 text-[#c19962] font-bold">
                    TODAY
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Phase Detail Panel (when selected) */}
        {selectedPhaseForDetail && (
          <div className="border-t border-border/30 bg-muted/20 p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded", GOAL_COLORS[selectedPhaseForDetail.goalType].gradient)}>
                    <span className="text-white">{GOAL_COLORS[selectedPhaseForDetail.goalType].icon}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{selectedPhaseForDetail.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {GOAL_LABELS[selectedPhaseForDetail.goalType]} • {selectedPhaseForDetail.status}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Target: </span>
                    <span className="font-medium">{selectedPhaseForDetail.targetWeightLbs} lbs @ {selectedPhaseForDetail.targetBodyFat}% BF</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    <span className="font-medium">
                      {Math.round((new Date(selectedPhaseForDetail.endDate).getTime() - new Date(selectedPhaseForDetail.startDate).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPhaseForDetail(null);
                    onPhaseClick?.(selectedPhaseForDetail);
                  }}
                >
                  Edit Phase
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setSelectedPhaseForDetail(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span className="font-mono">
            {phasePositions.length} phase{phasePositions.length !== 1 ? 's' : ''} visible
          </span>
          {phasePositions.length > 0 && (
            <span className="font-mono">
              {phasePositions.reduce((acc, p) => acc + p.durationWeeks, 0)} weeks planned
            </span>
          )}
        </div>
        <div className="flex gap-4">
          {eventPositions.length > 0 && (
            <span className="flex items-center gap-1">
              <Flag className="h-3 w-3" />
              {eventPositions.length} event{eventPositions.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-muted-foreground/60">
            Click to zoom • Hover for details
          </span>
        </div>
      </div>
      
      {/* Empty State */}
      {phasePositions.length === 0 && eventPositions.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No phases or events scheduled for this period
        </div>
      )}
    </div>
  );
}
