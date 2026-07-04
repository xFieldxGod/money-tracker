'use client'

import { useState, useEffect, useMemo, useId } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { format, addMonths, subMonths } from 'date-fns'
import { th } from 'date-fns/locale'
import { db } from '@/lib/firebase'
import { signedAmount, txMatchesWallet } from '@/lib/wallets'
import { isActiveTransaction } from '@/lib/trash'
import type { Transaction, Wallet } from '@/types'

type Range = '1W' | '1M' | '3M' | 'ALL' | 'MONTH'

interface Props {
  income: number
  expense: number
  transactions: Transaction[]
  userId: string
  selectedWalletId: 'all' | string
  wallets: Wallet[]
}

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Granularity = 'day' | 'week' | 'month'

// เลือกความถี่ของการรวมข้อมูลตามช่วงเวลาที่เลือก เพื่อให้จำนวนจุดบนกราฟคงที่
function granularityFor(range: Range): Granularity {
  if (range === '1W' || range === '1M' || range === 'MONTH') return 'day'
  if (range === '3M') return 'week'
  return 'month' // ALL
}

// แปลงวันที่ (YYYY-MM-DD) เป็น key ของ bucket ตาม granularity
function bucketKey(dateStr: string, g: Granularity): string {
  if (g === 'month') return dateStr.slice(0, 7) // YYYY-MM
  if (g === 'day') return dateStr // YYYY-MM-DD
  // week: เลื่อนไปวันจันทร์ของสัปดาห์นั้นเป็น key
  const d = new Date(dateStr + 'T00:00:00')
  const offset = (d.getDay() + 6) % 7 // 0 = จันทร์
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

// สร้าง SVG path แบบเส้นโค้งนุ่ม (Catmull-Rom → cubic Bézier)
function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 2) return ''
  const t = 0.18 // ค่าความนุ่มของเส้น
  let d = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) * t
    const c1y = p1.y + (p2.y - p0.y) * t
    const c2x = p2.x - (p3.x - p1.x) * t
    const c2y = p2.y - (p3.y - p1.y) * t
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function StockChart({ transactions, range, selectedWalletId, wallets }: { transactions: Transaction[]; range: Range; selectedWalletId: 'all' | string; wallets: Wallet[] }) {
  const gradId = useId()
  const points = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.created_at.localeCompare(b.created_at)
    })
    const g = granularityFor(range)
    // รวมเป็น bucket: เก็บยอดคงเหลือสะสม ณ ธุรกรรมสุดท้ายของแต่ละ bucket (closing balance)
    let balance = 0
    const buckets = new Map<string, number>()
    for (const tx of sorted) {
      balance += signedAmount(tx, selectedWalletId, wallets)
      buckets.set(bucketKey(tx.date, g), balance)
    }
    const ordered = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    return [{ balance: 0 }, ...ordered.map(([, bal]) => ({ balance: bal }))]
  }, [transactions, range, selectedWalletId, wallets])

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
  const span = maxVal - minVal || 1
  const W = 300
  const H = 60
  const PAD = 4

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * (W - PAD * 2) + PAD,
    y: H - PAD - ((p.balance - minVal) / span) * (H - PAD * 2),
  }))

  // สีตามเทรนด์รวม: ยอดปลายทาง vs ยอดเริ่มต้น
  const color = points[points.length - 1].balance >= points[0].balance ? '#10b981' : '#f43f5e'

  const linePath = smoothPath(coords)
  const last = coords[coords.length - 1]
  // พื้นที่ไล่เฉด: ลากเส้นโค้งเดิมลงไปชนขอบล่างแล้วปิด
  const areaPath = `${linePath} L ${last.x} ${H} L ${coords[0].x} ${H} Z`

  return (
    <div className="w-full select-none">
      <svg className="w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 64 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={last.x}
          cy={last.y}
          r="4"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

// ขอบเขตวันที่ของช่วงที่เลือก (to มีเฉพาะโหมดรายเดือน)
// ใช้ format ตามเวลาท้องถิ่น ไม่ใช้ toISOString เพื่อไม่ให้วันเพี้ยนจาก timezone
function getRangeBounds(range: Range, month: Date): { from: string; to?: string } {
  if (range === 'MONTH') {
    const ym = format(month, 'yyyy-MM')
    return { from: `${ym}-01`, to: `${ym}-31` }
  }
  const now = new Date()
  if (range === '1W') { now.setDate(now.getDate() - 7) }
  else if (range === '1M') { now.setMonth(now.getMonth() - 1) }
  else if (range === '3M') { now.setMonth(now.getMonth() - 3) }
  else return { from: '2000-01-01' }
  return { from: format(now, 'yyyy-MM-dd') }
}

export default function SummaryCards({ income, expense, transactions, userId, selectedWalletId, wallets }: Props) {
  const balance = income - expense
  const isPositive = balance >= 0
  const [range, setRange] = useState<Range>('ALL')
  const [chartMonth, setChartMonth] = useState(() => new Date())
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [loadingChart, setLoadingChart] = useState(false)

  useEffect(() => {
    if (!userId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingChart(true)
    const { from, to } = getRangeBounds(range, chartMonth)
    const constraints = [
      where('user_id', '==', userId),
      ...(range !== 'ALL' ? [where('date', '>=', from)] : []),
      ...(to ? [where('date', '<=', to)] : []),
      orderBy('date', 'asc'),
    ]
    const q = query(collection(db, 'transactions'), ...constraints)
    getDocs(q).then(snap => {
      const txs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Transaction))
        .filter(isActiveTransaction)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date)
          return a.created_at.localeCompare(b.created_at)
        })
      setAllTx(txs)
      setLoadingChart(false)
    })
  }, [userId, range, chartMonth])

  // merge transactions prop (เดือนปัจจุบัน) เข้า allTx แบบ realtime
  const chartTx = useMemo(() => {
    const { from, to } = getRangeBounds(range, chartMonth)
    const merged = new Map<string, Transaction>()
    for (const tx of allTx) merged.set(tx.id, tx)
    for (const tx of transactions) {
      if (tx.date >= from && (!to || tx.date <= to)) merged.set(tx.id, tx)
    }
    return [...merged.values()]
      .filter(tx => txMatchesWallet(tx, selectedWalletId, wallets))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.created_at.localeCompare(b.created_at)
      })
  }, [allTx, transactions, range, chartMonth, selectedWalletId, wallets])

  const RANGES: Range[] = ['1W', '1M', '3M', 'ALL', 'MONTH']
  const RANGE_LABELS: Record<Range, string> = { '1W': '1W', '1M': '1M', '3M': '3M', 'ALL': 'All', 'MONTH': 'เดือน' }

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
          <p className="text-[10px] font-bold text-slate-400/80">ยอดสุทธิเดือนนี้</p>
        </div>

        {/* Range selector + chart */}
        <div>
          <div className="flex flex-wrap justify-end gap-1 mb-1.5">
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
          {range === 'MONTH' && (
            <div className="flex items-center justify-end gap-1 mb-1.5">
              <button
                type="button"
                onClick={() => setChartMonth(m => subMonths(m, 1))}
                aria-label="เดือนก่อนหน้า"
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/60 text-slate-400 hover:text-slate-600 text-sm font-bold transition-all cursor-pointer"
              >
                ‹
              </button>
              <span className="text-[10px] font-bold text-slate-500 tabular-nums min-w-[86px] text-center">
                {format(chartMonth, 'MMMM yyyy', { locale: th })}
              </span>
              <button
                type="button"
                onClick={() => setChartMonth(m => addMonths(m, 1))}
                aria-label="เดือนถัดไป"
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/60 text-slate-400 hover:text-slate-600 text-sm font-bold transition-all cursor-pointer"
              >
                ›
              </button>
            </div>
          )}
          {loadingChart ? (
            <div className="h-16 flex items-center justify-center opacity-30">
              <div className="w-full h-0.5 bg-slate-200 rounded-full animate-pulse" />
            </div>
          ) : (
            <StockChart transactions={chartTx} range={range} selectedWalletId={selectedWalletId} wallets={wallets} />
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
