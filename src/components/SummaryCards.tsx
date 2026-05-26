'use client'

import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Transaction } from '@/types'

type Range = '1W' | '1M' | '3M' | 'ALL'

interface Props {
  income: number
  expense: number
  transactions: Transaction[]
  userId: string
}

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StockChart({ transactions }: { transactions: Transaction[] }) {
  const points = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.created_at.localeCompare(b.created_at)
    })
let balance = 0
    const pts: { balance: number }[] = [{ balance: 0 }]
    for (const tx of sorted) {
      balance += tx.type === 'income' ? tx.amount : -tx.amount
      pts.push({ balance })
    }
    return pts
  }, [transactions])

  if (points.length < 2) {
    return (
      <div className="w-full h-16 select-none opacity-20">
        <svg className="w-full h-full" viewBox="0 0 300 40" preserveAspectRatio="none">
          <path d="M0 20 L300 20" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 4" />
        </svg>
      </div>
    )
  }

  const values = points.map(p => p.balance)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1
  const W = 300
  const H = 60
  const PAD = 4

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * (W - PAD * 2) + PAD,
    y: H - PAD - ((p.balance - minVal) / range) * (H - PAD * 2),
    balance: p.balance,
  }))

  const segments = coords.slice(0, -1).map((c, i) => ({
    x1: c.x, y1: c.y,
    x2: coords[i + 1].x, y2: coords[i + 1].y,
    color: coords[i + 1].balance >= c.balance ? '#10b981' : '#f43f5e',
  }))

  const lastColor = segments[segments.length - 1].color

  return (
    <div className="w-full select-none">
      <svg className="w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 64 }}>
        {segments.map((seg, i) => (
          <line
            key={i}
            x1={seg.x1} y1={seg.y1}
            x2={seg.x2} y2={seg.y2}
            stroke={seg.color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r="4"
          fill={lastColor}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

function getRangeStart(range: Range): string {
  const now = new Date()
  if (range === '1W') { now.setDate(now.getDate() - 7) }
  else if (range === '1M') { now.setMonth(now.getMonth() - 1) }
  else if (range === '3M') { now.setMonth(now.getMonth() - 3) }
  else return '2000-01-01'
  return now.toISOString().slice(0, 10)
}

export default function SummaryCards({ income, expense, transactions, userId }: Props) {
  const balance = income - expense
  const isPositive = balance >= 0
  const [range, setRange] = useState<Range>('ALL')
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [loadingChart, setLoadingChart] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoadingChart(true)
    const fromDate = getRangeStart(range)
    const q = range === 'ALL'
      ? query(collection(db, 'transactions'), where('user_id', '==', userId), orderBy('date', 'asc'))
      : query(collection(db, 'transactions'), where('user_id', '==', userId), where('date', '>=', fromDate), orderBy('date', 'asc'))
    getDocs(q).then(snap => {
      const txs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Transaction))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date)
          return a.created_at.localeCompare(b.created_at)
        })
      setAllTx(txs)
      setLoadingChart(false)
    })
  }, [userId, range])

  // merge transactions prop (เดือนปัจจุบัน) เข้า allTx แบบ realtime
  const chartTx = useMemo(() => {
    if (allTx.length === 0) return allTx
    const fromDate = getRangeStart(range)
    const merged = new Map<string, Transaction>()
    for (const tx of allTx) merged.set(tx.id, tx)
    for (const tx of transactions) {
      if (tx.date >= fromDate) merged.set(tx.id, tx)
    }
    return [...merged.values()].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.created_at.localeCompare(b.created_at)
    })
  }, [allTx, transactions, range])

  const RANGES: Range[] = ['1W', '1M', '3M', 'ALL']
  const RANGE_LABELS: Record<Range, string> = { '1W': '1W', '1M': '1M', '3M': '3M', 'ALL': 'All' }

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-tr from-[#d4f7e6]/55 via-[#e0e7ff]/55 to-[#f3e8ff]/55 border border-white/80 backdrop-blur-xl p-6 sm:p-7 shadow-premium-lg transition-all hover:shadow-premium-xl">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-200/20 blur-xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-indigo-200/25 blur-xl pointer-events-none" />

      <div className="relative space-y-3">
        {/* Total Balance */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Balance (ยอดคงเหลือ)
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-slate-800 text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight">
              {isPositive ? '' : '-'}฿{fmt(Math.abs(balance))}
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-400/80">สถานะบัญชีปัจจุบัน</p>
        </div>

        {/* Range selector + chart */}
        <div>
          <div className="flex justify-end gap-1 mb-1.5">
            {RANGES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  range === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/60 text-slate-400 hover:text-slate-600'
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          {loadingChart ? (
            <div className="h-16 flex items-center justify-center opacity-30">
              <div className="w-full h-0.5 bg-slate-200 rounded-full animate-pulse" />
            </div>
          ) : (
            <StockChart transactions={chartTx} />
          )}
        </div>

        {/* Income / Expense */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-200/30 pt-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income (รายรับ)</p>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <span className="text-base sm:text-lg font-extrabold tabular-nums">฿{fmt(income)}</span>
              <span className="text-xs font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100/50">↗</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses (รายจ่าย)</p>
            <div className="flex items-center gap-1.5 text-rose-600">
              <span className="text-base sm:text-lg font-extrabold tabular-nums">฿{fmt(expense)}</span>
              <span className="text-xs font-bold bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100/50">↘</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
