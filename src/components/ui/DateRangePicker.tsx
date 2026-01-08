import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onApply?: () => void;
  label?: string;
}

const toISO = (d: Date | null) => d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10) : '';
const daysInMonth = (month: Date) => new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
const firstWeekday = (month: Date) => new Date(month.getFullYear(), month.getMonth(), 1).getDay();

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, onApply, label }) => {
  const [show, setShow] = useState(false);
  const [month, setMonth] = useState<Date>(value.start || new Date());
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  const isInRange = (day: Date) => {
    const { start, end } = value;
    if (!start) return false;
    if (start && !end) return day.getTime() === start.getTime();
    if (start && end) return day >= start && day <= end;
    return false;
  };
  const handleDayClick = (day: Date) => {
    onChange(
      !value.start || (value.start && value.end)
        ? { start: day, end: null }
        : day < value.start
        ? { start: day, end: value.start }
        : { start: value.start, end: day }
    );
  };
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={show}
        className="p-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 flex items-center min-w-[220px]"
      >
        <Calendar className="w-4 h-4 text-gray-500 mr-2" />
        <span className="truncate pr-2">
          {value.start && value.end ? `${toISO(value.start)} → ${toISO(value.end)}` : label || 'Select range'}
        </span>
        <span className={`text-[11px] transition-transform ${show ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {show && (
        <div className="absolute left-0 mt-2 z-30 w-[300px] border border-gray-200 rounded-xl bg-white shadow-xl p-3 space-y-3 animate-fade-in">
          {/* Calendar header */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">◀</button>
            <div className="text-xs font-medium text-gray-700">{month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
            <button type="button" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">▶</button>
          </div>
          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-[10px] font-medium text-gray-500">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center">{d}</div>)}</div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {Array.from({ length: firstWeekday(month) }).map((_,i) => <div key={'spacer'+i} />)}
            {Array.from({ length: daysInMonth(month) }).map((_,i) => {
              const day = new Date(month.getFullYear(), month.getMonth(), i+1);
              const selectedStart = value.start && day.getTime() === value.start.getTime();
              const selectedEnd = value.end && day.getTime() === value.end.getTime();
              const inRangeLocal = isInRange(day);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-7 rounded-md flex items-center justify-center transition border text-gray-700 ${selectedStart || selectedEnd ? 'bg-teal-600 text-white border-teal-600 font-semibold' : inRangeLocal ? 'bg-teal-100 border-teal-200' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                  title={toISO(day)}
                >{i+1}</button>
              );
            })}
          </div>
          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={() => { onChange({ start: null, end: null }); }} className="text-[11px] px-2 py-1 rounded-md border bg-white hover:bg-gray-100">Clear</button>
            <div className="flex gap-2">
              <button type="button" onClick={onApply} disabled={!value.start} className="text-[11px] px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-40">Apply</button>
              <button type="button" onClick={() => setShow(false)} className="text-[11px] px-3 py-1 rounded-md border bg-white hover:bg-gray-100">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
