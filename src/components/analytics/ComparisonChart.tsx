'use client'

import { useMemo } from 'react'
import { fmtMoney, fmtPct, STATUS_STYLE } from './StatPills'
import { STATUS_SHORT, type IncomeExpenseStats } from '@/lib/analytics'

export interface ComparisonRow {
  key: string
  label: string
  stats: IncomeExpenseStats
}

/**
 * กราฟแท่งคู่ รายรับ vs รายจ่าย ต่อช่วงเวลา (เดือนหรือปี)
 * วาดด้วย div ล้วน ไม่ใช้ไลบรารีกราฟ — เบาและคุม responsive ได้ตรงไปตรงมา
 */
export function ComparisonChart({ rows, emptyText }: { rows: ComparisonRow[]; emptyText: string }) {
  // สเกลแท่งเทียบกับค่าที่สูงที่สุดในชุด เพื่อให้เทียบข้ามช่วงเวลาได้
  const peak = useMemo(
    () => Math.max(...rows.map(r => Math.max(r.stats.income, r.stats.expense)), 0),
    [rows]
  )

  const hasData = rows.some(r => r.stats.count > 0)
  if (!hasData) {
    return (
      <div className="text-center text-xs font-bold text-slate-400 py-10">{emptyText}</div>
    )
  }

  return (
    <div className="space-y-3">
      {/* คำอธิบายสี */}
      <div className="flex items-center justify-end gap-3 text-[10px] font-bold">
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> รายรับ
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> รายจ่าย
        </span>
      </div>

      {/* แท่งกราฟ — เลื่อนแนวนอนได้เมื่อจอแคบ */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex items-end gap-2 min-w-fit h-40">
          {rows.map(row => {
            const incomeH = peak > 0 ? (row.stats.income / peak) * 100 : 0
            const expenseH = peak > 0 ? (row.stats.expense / peak) * 100 : 0
            const empty = row.stats.count === 0
            return (
              <div key={row.key} className="flex flex-col items-center gap-1.5 flex-1 min-w-[38px] h-full">
                <div className="flex-1 w-full flex items-end justify-center gap-[3px]">
                  <div
                    className={`w-1/2 max-w-[14px] rounded-t-md transition-all ${empty ? 'bg-slate-100' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    style={{ height: `${Math.max(incomeH, empty ? 2 : 1)}%` }}
                    title={`${row.label} — รายรับ ฿${fmtMoney(row.stats.income)}`}
                  />
                  <div
                    className={`w-1/2 max-w-[14px] rounded-t-md transition-all ${empty ? 'bg-slate-100' : 'bg-rose-500 hover:bg-rose-600'}`}
                    style={{ height: `${Math.max(expenseH, empty ? 2 : 1)}%` }}
                    title={`${row.label} — รายจ่าย ฿${fmtMoney(row.stats.expense)}`}
                  />
                </div>
                <span className={`text-[9px] font-bold whitespace-nowrap ${empty ? 'text-slate-300' : 'text-slate-500'}`}>
                  {row.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** ตารางรายละเอียดต่อช่วงเวลา พร้อม % และสถานะ */
export function ComparisonTable({ rows, periodLabel }: { rows: ComparisonRow[]; periodLabel: string }) {
  const visible = rows.filter(r => r.stats.count > 0)

  if (visible.length === 0) {
    return <div className="text-center text-xs font-bold text-slate-400 py-8">ยังไม่มีข้อมูล</div>
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[560px] text-left border-collapse">
        <thead>
          <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100">
            <th className="py-2 pr-2 font-bold">{periodLabel}</th>
            <th className="py-2 px-2 font-bold text-right">รายรับ</th>
            <th className="py-2 px-2 font-bold text-right">รายจ่าย</th>
            <th className="py-2 px-2 font-bold text-right">คงเหลือ</th>
            <th className="py-2 px-2 font-bold text-right">จ่าย/รับ</th>
            <th className="py-2 pl-2 font-bold text-right">สถานะ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/70">
          {visible.map(row => {
            const s = STATUS_STYLE[row.stats.status]
            return (
              <tr key={row.key} className="hover:bg-slate-50/70 transition-all">
                <td className="py-2.5 pr-2 text-xs font-extrabold text-slate-700 whitespace-nowrap">
                  {row.label}
                </td>
                <td className="py-2.5 px-2 text-xs font-bold text-emerald-600 tabular-nums text-right whitespace-nowrap">
                  ฿{fmtMoney(row.stats.income)}
                  <span className="block text-[9px] text-slate-400 font-bold">{fmtPct(row.stats.incomePct)}</span>
                </td>
                <td className="py-2.5 px-2 text-xs font-bold text-rose-600 tabular-nums text-right whitespace-nowrap">
                  ฿{fmtMoney(row.stats.expense)}
                  <span className="block text-[9px] text-slate-400 font-bold">{fmtPct(row.stats.expensePct)}</span>
                </td>
                <td className={`py-2.5 px-2 text-xs font-extrabold tabular-nums text-right whitespace-nowrap ${s.text}`}>
                  {row.stats.net < 0 ? '-' : ''}฿{fmtMoney(Math.abs(row.stats.net))}
                </td>
                <td className="py-2.5 px-2 text-xs font-bold text-slate-600 tabular-nums text-right whitespace-nowrap">
                  {row.stats.income > 0 ? fmtPct(row.stats.expenseToIncomePct) : '—'}
                </td>
                <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                  <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
                    {STATUS_SHORT[row.stats.status]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
