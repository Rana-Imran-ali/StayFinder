import React, { useState, useEffect, useCallback } from 'react';
import type { Property } from '../types/property';
import type { CalendarMatrixResponse, CalendarMatrixDay } from '../types/pricing';
import { pricingApi } from '../services/pricingApi';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Ban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface HostAvailabilityCalendarProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HostAvailabilityCalendar: React.FC<HostAvailabilityCalendarProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [loading, setLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarMatrixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selection state
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom price / settings for selected dates
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [minNightsInput, setMinNightsInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');

  // Range block state
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [rangeReason, setRangeReason] = useState<string>('');

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await pricingApi.getHostCalendar(property.id, year, month);
      if (res.success && res.data) {
        setCalendarData(res.data);
      } else {
        setError(res.message || 'Failed to load calendar data.');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching calendar.');
    } finally {
      setLoading(false);
    }
  }, [property.id]);

  useEffect(() => {
    if (isOpen) {
      fetchCalendar(currentYear, currentMonth);
      setSelectedDates([]);
    }
  }, [isOpen, currentYear, currentMonth, fetchCalendar]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const toggleDateSelection = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const selectAllMonth = () => {
    if (!calendarData) return;
    const all = calendarData.days.map((d) => d.date);
    setSelectedDates(all);
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setCustomPriceInput('');
    setMinNightsInput('');
    setNoteInput('');
  };

  const handleSetAvailability = async (isAvailable: boolean) => {
    if (selectedDates.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await pricingApi.updateAvailability(property.id, {
        dates: selectedDates,
        is_available: isAvailable,
        custom_price: customPriceInput ? parseFloat(customPriceInput) : null,
        min_nights: minNightsInput ? parseInt(minNightsInput, 10) : null,
        note: noteInput || null,
        status: isAvailable ? 'available' : 'blocked',
      });
      if (res.success) {
        setSuccessMsg(res.message || 'Updated successfully.');
        clearSelection();
        fetchCalendar(currentYear, currentMonth);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRangeAction = async (action: 'block' | 'unblock') => {
    if (!rangeStart || !rangeEnd) {
      setError('Please select both from and to dates for range blocking.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await pricingApi.blockDateRange(property.id, {
        from_date: rangeStart,
        to_date: rangeEnd,
        reason: rangeReason || undefined,
        action,
      });
      if (res.success) {
        setSuccessMsg(res.message || `${action === 'block' ? 'Blocked' : 'Unblocked'} range successfully.`);
        setRangeStart('');
        setRangeEnd('');
        setRangeReason('');
        fetchCalendar(currentYear, currentMonth);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply range update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build grid with leading blanks based on first day's day_of_week
  const firstDayOfWeek = calendarData?.days[0]?.day_of_week ?? 0;
  const blankDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Availability & Calendar</h2>
              <p className="text-xs text-slate-500">{property.title} • Base Rate: ${property.price_per_night}/night</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body: Calendar Grid on left, action controls on right */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Interactive Calendar */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Day Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 py-1 border-b border-slate-100">
              {DAY_LABELS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            {loading ? (
              <div className="flex-1 min-h-[320px] flex items-center justify-center text-slate-400 gap-2">
                <Loader2 size={24} className="animate-spin text-rose-500" />
                <span>Loading calendar matrix...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 mt-2">
                {/* Blank days before month start */}
                {blankDays.map((_, idx) => (
                  <div key={`blank-${idx}`} className="h-20 rounded-xl bg-slate-50/40 border border-transparent" />
                ))}

                {/* Actual days */}
                {calendarData?.days.map((day: CalendarMatrixDay) => {
                  const dayNum = parseInt(day.date.split('-')[2], 10);
                  const isSelected = selectedDates.includes(day.date);
                  const isPast = new Date(day.date) < new Date(today.toDateString());

                  let statusBg = 'bg-white hover:border-slate-400';
                  let statusBorder = 'border-slate-200';
                  let badge = null;

                  if (day.is_blocked || !day.is_available) {
                    statusBg = 'bg-rose-50/60 text-slate-400 line-through';
                    statusBorder = 'border-rose-200';
                  } else if (day.price_source === 'custom') {
                    badge = <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Custom</span>;
                  } else if (day.price_source === 'seasonal') {
                    badge = <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">Seasonal</span>;
                  } else if (day.price_source === 'weekend') {
                    badge = <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Weekend</span>;
                  }

                  if (isSelected) {
                    statusBorder = 'border-rose-500 ring-2 ring-rose-200';
                    statusBg = 'bg-rose-50/40';
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={isPast}
                      onClick={() => toggleDateSelection(day.date)}
                      className={`h-20 p-1.5 rounded-xl border flex flex-col justify-between text-left transition-all relative ${statusBg} ${statusBorder} ${
                        isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                          {dayNum}
                        </span>
                        {badge}
                      </div>

                      <div className="mt-auto">
                        <div className="text-xs font-bold text-slate-900">
                          ${day.effective_price}
                        </div>
                        {day.min_nights > 1 && (
                          <div className="text-[9px] text-slate-400">Min {day.min_nights}n</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <span>Blocked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1 rounded bg-blue-100 text-blue-800 font-bold">W</span>
                <span>Weekend Price</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1 rounded bg-purple-100 text-purple-800 font-bold">S</span>
                <span>Seasonal Price</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-800 font-bold">C</span>
                <span>Custom Override</span>
              </div>
            </div>
          </div>

          {/* Right Col: Host Action Panel */}
          <div className="space-y-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Selected Dates Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800">
                  Selected Dates ({selectedDates.length})
                </h4>
                {selectedDates.length > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedDates.length === 0 ? (
                <div className="p-3 bg-white border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 text-center">
                  Click any calendar days to select and bulk update their pricing or block status.
                  <button
                    type="button"
                    onClick={selectAllMonth}
                    className="block mx-auto mt-2 text-rose-500 font-semibold hover:underline"
                  >
                    Select All in Month
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Custom Nightly Rate ($)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 199"
                      value={customPriceInput}
                      onChange={(e) => setCustomPriceInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Min Nights Required
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2"
                      value={minNightsInput}
                      onChange={(e) => setMinNightsInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Note / Holiday Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Peak Weekend / Maintenance"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSetAvailability(true)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Set Available
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSetAvailability(false)}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Ban size={14} />
                      Block Dates
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Date Range Blocker */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Ban size={15} className="text-rose-500" />
                Quick Range Block / Unblock
              </h4>

              <div className="space-y-2.5 bg-white p-3 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block">From</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block">To</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Reason (optional, e.g. Renovation)"
                    value={rangeReason}
                    onChange={(e) => setRangeReason(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting || !rangeStart || !rangeEnd}
                    onClick={() => handleRangeAction('block')}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold disabled:opacity-40"
                  >
                    Block Range
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !rangeStart || !rangeEnd}
                    onClick={() => handleRangeAction('unblock')}
                    className="px-2 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold disabled:opacity-40"
                  >
                    Unblock Range
                  </button>
                </div>
              </div>
            </div>

            {/* Active Seasonal Windows */}
            {calendarData && calendarData.seasonal_rules.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Sparkles size={13} className="text-purple-600" />
                  Active Seasonal Rules
                </h4>
                <div className="space-y-1.5">
                  {calendarData.seasonal_rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-2 bg-purple-50/60 border border-purple-100 rounded-md text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-purple-900">{rule.name}</div>
                        <div className="text-[10px] text-purple-600">
                          {rule.start_date} to {rule.end_date}
                        </div>
                      </div>
                      <span className="font-bold text-purple-800">${rule.price_per_night}/n</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
