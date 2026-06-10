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

// เปอร์เซ็นต์ที่แสดงขั้นต่ำ 1% — หมวดเล็ก ๆ จะได้ไม่ขึ้นเป็น 0%
const formatPercent = (pct: number) => `${Math.max(1, Math.round(pct))}%`

export default function MonthlyChart({ transactions }: Props) {
  const expenseByCategory = useMemo(() => {
    // รวมหมวดที่ชื่อเดียวกันแต่บันทึกมาคนละแบบ (มี/ไม่มีอีโมจินำหน้า) เป็นหมวดเดียว
    const bycat = new Map<string, { name: string; value: number; icon: string }>()
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      const name = getCategoryName(t.category)
      const icon = getCategoryIcon(t.category)
      const entry = bycat.get(name)
      if (entry) {
        entry.value += t.amount
        if (entry.icon === '💳' && icon !== '💳') entry.icon = icon
      } else {
        bycat.set(name, { name, value: t.amount, icon })
      }
    }
    return [...bycat.values()].sort((a, b) => b.value - a.value)
  }, [transactions])

  const totalExpense = useMemo(
    () => expenseByCategory.reduce((s, x) => s + x.value, 0),
    [expenseByCategory]
  )

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center text-gray-400 border border-gray-100">
        <p className="text-4xl mb-3">📭</p>
        <p>ยังไม่มีรายการในเดือนนี้</p>
      </div>
    )
  }

  const donutOption = expenseByCategory.length > 0 ? {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 15, 35, 0.92)',
      borderColor: 'rgba(99,102,241,0.3)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 11, fontFamily: 'var(--font-sans)' },
      formatter: (p: PieTooltipParam) =>
        `<div style="font-weight:700;margin-bottom:3px;color:#a5b4fc">${expenseByCategory.find(c => c.name === p.name)?.icon ?? '💳'} ${p.name}</div>` +
        `<div style="color:#f1f5f9;font-weight:800;font-size:13px">฿${Number(p.value).toLocaleString('th-TH')}</div>` +
        `<div style="color:#94a3b8;font-size:10px">${formatPercent(p.percent)} ของรายจ่ายทั้งหมด</div>`,
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
            text: 'รวมรายจ่าย',
            textAlign: 'center',
            fill: '#94a3b8',
            fontSize: 9,
            fontWeight: '600',
            fontFamily: 'var(--font-sans)',
          },
          left: 'center',
          top: -16,
        },
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
          top: 0,
        },
      ],
    }],
    series: [
      {
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '50%'],
        // ปิด hideOverlap (default ของ pie คือ true) — ไม่งั้น label manager ของ ECharts
        // จะเห็น % กับป้ายไอคอนของอีก series เกยกันนิดเดียวแล้วตัดทิ้งเหลืออันเดียว
        labelLayout: { hideOverlap: false },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        // เปอร์เซ็นต์สีขาวอยู่ในชิ้นโดนัท (ชิ้นเล็กกว่า 5% ใส่ตัวเลขไม่พอ — ดูจากลิสต์ด้านล่างแทน)
        label: {
          show: true,
          position: 'inside',
          formatter: (p: PieTooltipParam) => (p.percent >= 5 ? formatPercent(p.percent) : ''),
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold',
          fontFamily: 'var(--font-sans)',
        },
        labelLine: { show: false },
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
      },
      {
        // วงแหวนโปร่งใส ใช้วางไอคอนหมวดเป็นวงกลมคร่อมขอบนอกของโดนัท (label อยู่กึ่งกลางที่ 77%)
        type: 'pie',
        radius: ['62%', '92%'],
        center: ['50%', '50%'],
        labelLayout: { hideOverlap: false },
        silent: true,
        itemStyle: { color: 'transparent' },
        label: {
          position: 'inside',
          formatter: (p: PieTooltipParam) =>
            expenseByCategory.find(c => c.name === p.name)?.icon ?? '',
          fontSize: 12,
          width: 22,
          height: 22,
          lineHeight: 22,
          align: 'center',
          backgroundColor: '#fff',
          borderRadius: 12,
          borderWidth: 2,
          shadowBlur: 6,
          shadowColor: 'rgba(15, 23, 42, 0.18)',
          shadowOffsetY: 1,
        },
        labelLine: { show: false },
        data: expenseByCategory.map((item, i) => {
          const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0
          return {
            name: item.name,
            value: item.value,
            // ชิ้นเล็กมากไม่วางไอคอน ไม่งั้นป้ายซ้อนกันจนอ่านไม่ออก
            label: { show: pct >= 4, borderColor: COLORS[i % COLORS.length] },
          }
        }),
      },
    ],
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
            <ReactECharts echarts={echarts} option={donutOption} style={{ height: 200, width: '100%', maxWidth: 240 }} />
          </div>

          {/* Category rows: ไอคอน → ชื่อ → % → จำนวนเงิน */}
          <div className="divide-y divide-slate-100/70">
            {expenseByCategory.map((item, i) => {
              const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0
              const color = COLORS[i % COLORS.length]
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 py-2.5 px-1 hover:bg-slate-50/70 rounded-xl transition-all group cursor-default"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2 bg-white shadow-sm"
                    style={{ borderColor: color, backgroundColor: `${color}14` }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[13px] font-bold text-slate-700 truncate flex-1 group-hover:text-slate-900">
                    {item.name}
                  </span>
                  <span className="text-xs font-extrabold tabular-nums flex-shrink-0" style={{ color }}>
                    {formatPercent(pct)}
                  </span>
                  <span className="text-[13px] font-extrabold text-slate-800 tabular-nums text-right w-20 flex-shrink-0">
                    ฿{item.value.toLocaleString('th-TH')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
