'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, isToday,
} from 'date-fns'
import { th } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
}

const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function formatDisplay(value: string) {
  if (!value) return 'เลือกวันที่'
  return format(new Date(value + 'T00:00:00'), 'd MMM yyyy', { locale: th })
}

export default function DatePicker({ value, onChange }: Props) {
  const selected = value ? new Date(value + 'T00:00:00') : new Date()
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(selected)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false })
  const btnRef = useRef<HTMLButtonElement>(null)
  const calRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !calRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openPicker() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const calH = 360
    const spaceBelow = window.innerHeight - rect.bottom
    const above = spaceBelow < calH && rect.top > calH
    setPos({
      top: above ? rect.top + window.scrollY - calH - 8 : rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
      width: rect.width,
      above,
    })
    setViewMonth(selected)
    setOpen(v => !v)
  }

  function selectDay(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const startPad = getDay(startOfMonth(viewMonth))

  const calendar = open && typeof window !== 'undefined' ? createPortal(
    <div
      ref={calRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-4"
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-extrabold text-slate-800 text-sm">
          {format(viewMonth, 'MMMM yyyy', { locale: th })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className={`text-center text-[11px] font-bold py-1 ${d === 'อา' ? 'text-rose-400' : d === 'ส' ? 'text-indigo-400' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const isSel = isSameDay(day, selected)
          const isT = isToday(day)
          const dow = getDay(day)
          const isSun = dow === 0
          const isSat = dow === 6
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => selectDay(day)}
              className={`h-9 w-full rounded-xl text-sm font-bold transition-all flex items-center justify-center cursor-pointer
                ${isSel
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                  : isT
                  ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-300'
                  : isSun
                  ? 'text-rose-400 hover:bg-rose-50'
                  : isSat
                  ? 'text-indigo-400 hover:bg-indigo-50'
                  : 'text-slate-700 hover:bg-slate-100'
                }`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>

      {/* Today shortcut */}
      {!isToday(selected) && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => selectDay(new Date())}
            className="text-xs font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            วันนี้
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center justify-between border rounded-2xl px-4 py-3 bg-white transition-all text-left ${
          open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className={`text-sm font-bold ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {formatDisplay(value)}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {calendar}
    </div>
  )
}
