'use client'

import { ArrowUpRight, ArrowDownRight, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { BalanceStatus, IncomeExpenseStats } from '@/lib/analytics'
import { STATUS_LABEL } from '@/lib/analytics'

export function fmtMoney(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtPct(n: number) {
  return `${n.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`
}

/** สีประจำสถานะ ใช้ให้ตรงกันทุกที่: เขียว = เหลือ, แดง = ขาด, เทา = เท่ากัน */
export const STATUS_STYLE: Record<BalanceStatus, { text: string; bg: string; border: string; bar: string }> = {
  surplus: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', bar: 'bg-emerald-500' },
  deficit: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', bar: 'bg-rose-500' },
  balanced: { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', bar: 'bg-slate-400' },
}

const STATUS_ICON: Record<BalanceStatus, typeof TrendingUp> = {
  surplus: TrendingUp,
  deficit: TrendingDown,
  balanced: Minus,
}

/** ป้ายบอกสถานะ รายรับมากกว่า / รายจ่ายมากกว่า / เท่ากัน */
export function StatusBadge({ status, size = 'md' }: { status: BalanceStatus; size?: 'sm' | 'md' }) {
  const s = STATUS_STYLE[status]
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-extrabold rounded-full border ${s.bg} ${s.text} ${s.border} ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2.5} />
      {STATUS_LABEL[status]}
    </span>
  )
}

/**
 * แถบเทียบสัดส่วนรายรับ vs รายจ่าย — ความยาวแต่ละฝั่ง = % ของกระแสเงินรวม
 * ตอบโจทย์ "รายรับกี่% รายจ่ายกี่%" แบบเห็นภาพในแถบเดียว
 */
export function IncomeExpenseBar({ stats }: { stats: IncomeExpenseStats }) {
  if (stats.total === 0) {
    return <div className="h-2.5 rounded-full bg-slate-100" />
  }
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${stats.incomePct}%` }}
          title={`รายรับ ${fmtPct(stats.incomePct)}`}
        />
        <div
          className="bg-rose-500 transition-all"
          style={{ width: `${stats.expensePct}%` }}
          title={`รายจ่าย ${fmtPct(stats.expensePct)}`}
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-emerald-600">รายรับ {fmtPct(stats.incomePct)}</span>
        <span className="text-rose-600">รายจ่าย {fmtPct(stats.expensePct)}</span>
      </div>
    </div>
  )
}

/** การ์ดสรุปตัวเลขหลัก 1 ช่อง */
export function StatCard({
  label,
  value,
  sub,
  tone = 'slate',
  icon,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'emerald' | 'rose' | 'indigo' | 'slate'
  icon?: React.ReactNode
}) {
  const tones = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100/60',
    rose: 'text-rose-600 bg-rose-50 border-rose-100/60',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100/60',
    slate: 'text-slate-700 bg-slate-50 border-slate-200/60',
  }[tone]

  return (
    <div className="bg-white border border-slate-200/45 rounded-[20px] p-4 shadow-premium space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        {icon && (
          <span className={`inline-flex items-center justify-center p-1 rounded-md border ${tones}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="text-lg sm:text-xl font-extrabold tabular-nums text-slate-800 tracking-tight">{value}</p>
      {sub && <p className="text-[10px] font-bold text-slate-400">{sub}</p>}
    </div>
  )
}

/** แถวการ์ด รายรับ / รายจ่าย / คงเหลือ ใช้ซ้ำทั้งหน้าผู้ใช้และหน้าแอดมิน */
export function StatsRow({ stats }: { stats: IncomeExpenseStats }) {
  const s = STATUS_STYLE[stats.status]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        label="รายรับรวม"
        value={`฿${fmtMoney(stats.income)}`}
        sub={`${fmtPct(stats.incomePct)} ของกระแสเงินรวม`}
        tone="emerald"
        icon={<ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />}
      />
      <StatCard
        label="รายจ่ายรวม"
        value={`฿${fmtMoney(stats.expense)}`}
        sub={`${fmtPct(stats.expensePct)} ของกระแสเงินรวม`}
        tone="rose"
        icon={<ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.5} />}
      />
      <div className="bg-white border border-slate-200/45 rounded-[20px] p-4 shadow-premium space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-slate-400">คงเหลือสุทธิ</p>
          <span className={`inline-flex items-center justify-center p-1 rounded-md border ${s.bg} ${s.text} ${s.border}`}>
            <Scale className="w-3.5 h-3.5" strokeWidth={2.5} />
          </span>
        </div>
        <p className={`text-lg sm:text-xl font-extrabold tabular-nums tracking-tight ${s.text}`}>
          {stats.net < 0 ? '-' : ''}฿{fmtMoney(Math.abs(stats.net))}
        </p>
        <p className="text-[10px] font-bold text-slate-400">
          {stats.income > 0 ? `เก็บออมได้ ${fmtPct(stats.savingsRatePct)}` : 'ยังไม่มีรายรับ'}
        </p>
      </div>
    </div>
  )
}
