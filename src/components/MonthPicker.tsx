'use client'

import { format, addMonths, subMonths, isSameMonth } from 'date-fns'
import { th } from 'date-fns/locale'

interface Props {
  value: Date
  onChange: (date: Date) => void
}

export default function MonthPicker({ value, onChange }: Props) {
  const isCurrentMonth = isSameMonth(value, new Date())

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(subMonths(value, 1))}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-sm"
      >
        ‹
      </button>

      <div className="flex flex-col items-center px-1 sm:px-2">
        <span className="font-semibold text-gray-900 min-w-[96px] sm:min-w-[110px] text-center text-xs sm:text-sm tabular-nums leading-tight">
          {format(value, 'MMMM yyyy', { locale: th })}
        </span>
        {!isCurrentMonth && (
          <button
            onClick={() => onChange(new Date())}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-0.5 transition-colors"
          >
            กลับเดือนนี้
          </button>
        )}
      </div>

      <button
        onClick={() => onChange(addMonths(value, 1))}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-sm"
      >
        ›
      </button>
    </div>
  )
}
