'use client'

import { useState } from 'react'
import { localFallbackParse, type ParsedExpense } from '@/lib/parseExpense'
import { Sparkles, Loader2, TriangleAlert } from 'lucide-react'

interface Props {
  expenseCategories: string[]
  incomeCategories: string[]
  onParsed: (parsed: ParsedExpense) => void
}

export default function QuickAddBar({ expenseCategories, incomeCategories, onParsed }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    const today = new Date().toISOString().split('T')[0]

    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, today, expenseCategories, incomeCategories }),
      })
      if (!res.ok) throw new Error('AI error')
      const parsed = (await res.json()) as ParsedExpense
      onParsed(parsed)
      setText('')
    } catch {
      // AI ใช้ไม่ได้ → ใช้ fallback ดึงจำนวนเงินมาให้ ผู้ใช้เลือกหมวดเอง
      setError('AI ไม่พร้อมใช้งาน — กรอกหมวดหมู่เองได้เลย')
      onParsed(localFallbackParse(trimmed, today))
      setText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200/45 p-3 rounded-[24px] shadow-premium">
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 pl-0.5" />
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={loading}
          placeholder="พิมพ์เร็ว เช่น ตีแบด 205 บาท"
          className="flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none placeholder:text-slate-300 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-100 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap min-w-[96px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> วิเคราะห์...
            </>
          ) : (
            'วิเคราะห์ด่วน'
          )}
        </button>
      </form>
      {error && (
        <p className="text-[11px] font-semibold text-amber-600 mt-2 pl-1.5 flex items-center gap-1">
          <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
