'use client'

import { useMemo } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import ReactECharts from 'echarts-for-react/lib/core'
import type { Transaction } from '@/types'
import { getCategoryIcon, getCategoryName } from './TransactionList'

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, GraphicComponent, CanvasRenderer])

interface Props {
  transactions: Transaction[]
}

type PieTooltipParam = {
  marker: string
  name: string
  value: number
  percent: number
}

const COLORS = [
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
]

const COLOR_GRADIENTS = [
  ['#818cf8', '#6366f1'],
  ['#fb7185', '#f43f5e'],
  ['#34d399', '#10b981'],
  ['#fcd34d', '#f59e0b'],
  ['#60a5fa', '#3b82f6'],
  ['#c084fc', '#a855f7'],
  ['#f472b6', '#ec4899'],
  ['#2dd4bf', '#14b8a6'],
  ['#fb923c', '#f97316'],
]

export default function MonthlyChart({ transactions }: Props) {
  const expenseByCategory = useMemo(() => {
    const bycat: Record<string, number> = {}
    for (const t of transactions.filter(t => t.type === 'expense')) {
      bycat[t.category] = (bycat[t.category] ?? 0) + t.amount
    }
    return Object.entries(bycat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center text-gray-400 border border-gray-100">
        <p className="text-4xl mb-3">📭</p>
        <p>ยังไม่มีรายการในเดือนนี้</p>
      </div>
    )
  }

  const totalExpense = useMemo(
    () => expenseByCategory.reduce((s, x) => s + x.value, 0),
    [expenseByCategory]
  )

  const donutOption = expenseByCategory.length > 0 ? {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 15, 35, 0.92)',
      borderColor: 'rgba(99,102,241,0.3)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 11, fontFamily: 'var(--font-sans)' },
      formatter: (p: PieTooltipParam) =>
        `<div style="font-weight:700;margin-bottom:3px;color:#a5b4fc">${getCategoryIcon(p.name)} ${getCategoryName(p.name)}</div>` +
        `<div style="color:#f1f5f9;font-weight:800;font-size:13px">฿${Number(p.value).toLocaleString('th-TH')}</div>` +
        `<div style="color:#94a3b8;font-size:10px">${p.percent.toFixed(1)}% ของรายจ่ายทั้งหมด</div>`,
    },
    legend: { show: false },
    graphic: [{
      type: 'group',
      left: 'center',
      top: 'center',
      children: [
        {
          type: 'text',
          style: {
            text: `฿${totalExpense.toLocaleString('th-TH')}`,
            textAlign: 'center',
            fill: '#1e293b',
            fontSize: 15,
            fontWeight: '800',
            fontFamily: 'var(--font-sans)',
          },
          left: 'center',
          top: -10,
        },
        {
          type: 'text',
          style: {
            text: 'รวมรายจ่าย',
            textAlign: 'center',
            fill: '#94a3b8',
            fontSize: 9,
            fontWeight: '600',
            fontFamily: 'var(--font-sans)',
          },
          left: 'center',
          top: 14,
        },
      ],
    }],
    series: [{
      type: 'pie',
      radius: ['48%', '68%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
      label: {
        show: true,
        position: 'outside',
        formatter: (p: PieTooltipParam) => `${p.percent.toFixed(0)}%`,
        color: '#475569',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'var(--font-sans)',
      },
      labelLine: {
        show: true,
        length: 6,
        length2: 4,
        lineStyle: { color: '#cbd5e1', width: 1.5 },
      },
      emphasis: {
        scaleSize: 5,
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(99,102,241,0.4)' },
      },
      data: expenseByCategory.map((item, i) => ({
        name: item.name,
        value: item.value,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: COLOR_GRADIENTS[i % COLOR_GRADIENTS.length][0] },
            { offset: 1, color: COLOR_GRADIENTS[i % COLOR_GRADIENTS.length][1] },
          ]),
        },
      })),
    }],
  } : null

  return (
    <div className="space-y-3">
      {/* Donut Chart Card */}
      {donutOption && (
        <div className="bg-white rounded-[22px] p-4 sm:p-5 border border-slate-200/40 shadow-premium transition-all hover:shadow-premium-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">สัดส่วนรายจ่าย</h3>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
              {expenseByCategory.length} หมวดหมู่
            </span>
          </div>

          {/* Donut Chart */}
          <div className="flex justify-center">
            <ReactECharts echarts={echarts} option={donutOption} style={{ height: 180, width: '100%', maxWidth: 220 }} />
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {expenseByCategory.map((item, i) => {
              const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0
              const color = COLORS[i % COLORS.length]
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-all group cursor-default"
                >
                  {/* Color bar */}
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-sm leading-none">{getCategoryIcon(item.name)}</span>
                      <span className="text-[11px] font-bold text-slate-700 truncate group-hover:text-slate-900">
                        {getCategoryName(item.name)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-extrabold text-slate-800">
                        ฿{item.value.toLocaleString('th-TH')}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
