'use client'

import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { isActiveTransaction } from '@/lib/trash'
import type { Transaction } from '@/types'
import {
  computeStats, monthlyBreakdown, yearlyBreakdown, availableYears,
  monthPopularity, perUserBreakdown, statusDistribution, categoryRanking,
  STATUS_SHORT, MONTH_NAMES_TH,
} from '@/lib/analytics'
import { StatCard, StatsRow, IncomeExpenseBar, fmtMoney, fmtPct, STATUS_STYLE } from './analytics/StatPills'
import { ComparisonChart, ComparisonTable, type ComparisonRow } from './analytics/ComparisonChart'
import {
  Shield, ArrowLeft, Users, Receipt, CalendarDays, TrendingUp, TrendingDown, Minus, Download,
} from 'lucide-react'

type View = 'month' | 'year'

export default function AdminClient() {
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('month')
  const [pickedYear, setPickedYear] = useState<number>(() => new Date().getFullYear())
  const [popularityYear, setPopularityYear] = useState<number | 'all'>('all')

  // แอดมินอ่าน transactions ทั้งคอลเลกชัน — firestore.rules อนุญาตเฉพาะ role admin
  useEffect(() => {
    let cancelled = false
    getDocs(collection(db, 'transactions'))
      .then(snap => {
        if (cancelled) return
        setAllTx(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)).filter(isActiveTransaction))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('อ่านข้อมูลไม่สำเร็จ — ตรวจสอบว่าบัญชีนี้ตั้ง role: "admin" ใน Firestore แล้ว และ deploy firestore.rules ล่าสุดแล้ว')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // จัดกลุ่มรายการตามผู้ใช้ — เป็นฐานของสถิติรายคนทั้งหมด
  const byUser = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of allTx) {
      if (!tx.user_id) continue
      const list = map.get(tx.user_id)
      if (list) list.push(tx)
      else map.set(tx.user_id, [tx])
    }
    return map
  }, [allTx])

  const years = useMemo(() => {
    const found = availableYears(allTx)
    const current = new Date().getFullYear()
    return found.includes(current) ? found : [current, ...found]
  }, [allTx])

  // ปีที่ใช้จริง — ถ้าปีที่เลือกไม่มีในข้อมูล ให้ตกกลับปีล่าสุด (คำนวณตอน render)
  const selectedYear = years.includes(pickedYear) ? pickedYear : (years[0] ?? pickedYear)

  const yearTx = useMemo(
    () => allTx.filter(tx => Number(tx.date.slice(0, 4)) === selectedYear),
    [allTx, selectedYear]
  )

  const scopeTx = view === 'month' ? yearTx : allTx
  const scopeStats = useMemo(() => computeStats(scopeTx), [scopeTx])

  const months = useMemo(() => monthlyBreakdown(allTx, selectedYear), [allTx, selectedYear])
  const yearsData = useMemo(() => yearlyBreakdown(allTx), [allTx])

  const rows: ComparisonRow[] = useMemo(() => {
    if (view === 'month') return months.map(m => ({ key: m.key, label: m.label, stats: m.stats }))
    return yearsData.map(y => ({ key: String(y.year), label: `พ.ศ. ${y.label}`, stats: y.stats }))
  }, [view, months, yearsData])

  // ความนิยมรายเดือน — เดือนไหนมีคนใช้กี่คน
  const popularity = useMemo(() => monthPopularity(byUser, popularityYear), [byUser, popularityYear])
  const peakMonth = useMemo(
    () => popularity.reduce((a, b) => (b.users > a.users ? b : a), popularity[0]),
    [popularity]
  )

  // สถิติรายคน + การกระจายตัวตามสถานะ (คิดจากช่วงที่เลือกอยู่)
  const scopeByUser = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of scopeTx) {
      if (!tx.user_id) continue
      const list = map.get(tx.user_id)
      if (list) list.push(tx)
      else map.set(tx.user_id, [tx])
    }
    return map
  }, [scopeTx])

  const users = useMemo(() => perUserBreakdown(scopeByUser), [scopeByUser])
  const dist = useMemo(() => statusDistribution(users), [users])
  const topCats = useMemo(() => categoryRanking(scopeTx, 'expense').slice(0, 8), [scopeTx])

  // ค่าเฉลี่ยต่อคน ใช้ตอบว่าผู้ใช้ทั่วไปมีพฤติกรรมยังไง
  const avgPerUser = useMemo(() => {
    if (users.length === 0) return null
    const totalIncome = users.reduce((s, u) => s + u.stats.income, 0)
    const totalExpense = users.reduce((s, u) => s + u.stats.expense, 0)
    const totalCount = users.reduce((s, u) => s + u.stats.count, 0)
    return {
      income: totalIncome / users.length,
      expense: totalExpense / users.length,
      count: totalCount / users.length,
    }
  }, [users])

  function exportCSV() {
    const header = 'ผู้ใช้,รายรับ,รายจ่าย,คงเหลือ,รายรับ%,รายจ่าย%,จ่ายต่อรับ%,สถานะ,จำนวนรายการ,ใช้งานล่าสุด\n'
    const body = users.map(u => [
      u.userId,
      u.stats.income.toFixed(2),
      u.stats.expense.toFixed(2),
      u.stats.net.toFixed(2),
      u.stats.incomePct,
      u.stats.expensePct,
      u.stats.expenseToIncomePct,
      STATUS_SHORT[u.stats.status],
      u.stats.count,
      u.lastActive ?? '-',
    ].join(',')).join('\n')

    const scope = view === 'month' ? `พ.ศ.${selectedYear + 543}` : 'ทุกปี'
    const blob = new Blob(['﻿' + header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-analytics-${scope}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-9 w-56 bg-slate-200/80 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-slate-200/40 rounded-[20px] animate-pulse shadow-premium" />)}
        </div>
        <div className="h-64 bg-white border border-slate-200/40 rounded-[24px] animate-pulse shadow-premium" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-24">
        <div className="bg-white border border-rose-200 rounded-[24px] p-6 shadow-premium space-y-3 text-center">
          <Shield className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">เข้าถึงข้อมูลไม่ได้</p>
          <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-md mx-auto">{error}</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  const scopeLabel = view === 'month' ? `ปี พ.ศ. ${selectedYear + 543}` : 'ทุกปีรวมกัน'

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" /> แดชบอร์ดผู้ดูแลระบบ
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            ภาพรวมการใช้งานและพฤติกรรมการเงินของผู้ใช้ทั้งระบบ
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            disabled={users.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">CSV</span>
          </button>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">หน้าวิเคราะห์</span>
          </Link>
        </div>
      </div>

      {/* ตัวกรอง */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-3 shadow-premium flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/50">
          {(['month', 'year'] as View[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                view === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v === 'month' ? 'รายเดือน' : 'รายปี'}
            </button>
          ))}
        </div>
        {view === 'month' && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={e => setPickedYear(Number(e.target.value))}
              className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {years.map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* KPI รวมระบบ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="ผู้ใช้ทั้งหมด"
          value={String(byUser.size)}
          sub={`มีข้อมูลใน${scopeLabel} ${users.length} คน`}
          tone="indigo"
          icon={<Users className="w-3.5 h-3.5" strokeWidth={2.5} />}
        />
        <StatCard
          label="รายการทั้งหมด"
          value={allTx.length.toLocaleString('th-TH')}
          sub={`ใน${scopeLabel} ${scopeTx.length.toLocaleString('th-TH')} รายการ`}
          tone="slate"
          icon={<Receipt className="w-3.5 h-3.5" strokeWidth={2.5} />}
        />
        <StatCard
          label="เฉลี่ยรายรับ/คน"
          value={avgPerUser ? `฿${fmtMoney(avgPerUser.income)}` : '—'}
          sub={avgPerUser ? `${avgPerUser.count.toFixed(1)} รายการ/คน` : undefined}
          tone="emerald"
          icon={<TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />}
        />
        <StatCard
          label="เฉลี่ยรายจ่าย/คน"
          value={avgPerUser ? `฿${fmtMoney(avgPerUser.expense)}` : '—'}
          sub={peakMonth ? `เดือนนิยม: ${MONTH_NAMES_TH[peakMonth.month - 1]}` : undefined}
          tone="rose"
          icon={<TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
        />
      </div>

      {/* รายรับ/รายจ่ายรวมทั้งระบบ */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 pl-1">ยอดรวมทั้งระบบ — {scopeLabel}</h3>
        <StatsRow stats={scopeStats} />
      </div>

      {/* การกระจายตัวของผู้ใช้ตามสถานะการเงิน */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-800">ผู้ใช้แบ่งตามสถานะการเงิน</h3>
          <span className="text-[10px] font-bold text-slate-400">{dist.total} คนที่มีข้อมูล</span>
        </div>

        {dist.total === 0 ? (
          <p className="text-[11px] font-bold text-slate-400 text-center py-6">ยังไม่มีข้อมูลในช่วงนี้</p>
        ) : (
          <>
            {/* แถบสัดส่วน 3 สถานะ */}
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
              <div className="bg-emerald-500" style={{ width: `${dist.surplusPct}%` }} title={`เงินเหลือ ${fmtPct(dist.surplusPct)}`} />
              <div className="bg-rose-500" style={{ width: `${dist.deficitPct}%` }} title={`เงินขาด ${fmtPct(dist.deficitPct)}`} />
              <div className="bg-slate-400" style={{ width: `${dist.balancedPct}%` }} title={`เท่ากัน ${fmtPct(dist.balancedPct)}`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <DistCard
                icon={<TrendingUp className="w-4 h-4" strokeWidth={2.5} />}
                label="รายรับมากกว่ารายจ่าย"
                count={dist.surplus}
                pct={dist.surplusPct}
                tone="emerald"
              />
              <DistCard
                icon={<TrendingDown className="w-4 h-4" strokeWidth={2.5} />}
                label="รายจ่ายมากกว่ารายรับ"
                count={dist.deficit}
                pct={dist.deficitPct}
                tone="rose"
              />
              <DistCard
                icon={<Minus className="w-4 h-4" strokeWidth={2.5} />}
                label="รายรับเท่ากับรายจ่าย"
                count={dist.balanced}
                pct={dist.balancedPct}
                tone="slate"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5">
              <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                จากผู้ใช้ {dist.total} คนที่มีข้อมูลใน{scopeLabel} —{' '}
                <span className="font-extrabold text-rose-600">{fmtPct(dist.deficitPct)}</span> ใช้จ่ายเกินรายรับ,{' '}
                <span className="font-extrabold text-emerald-600">{fmtPct(dist.surplusPct)}</span> มีเงินเหลือเก็บ
                {dist.balanced > 0 && <> และ <span className="font-extrabold text-slate-600">{fmtPct(dist.balancedPct)}</span> พอดีกัน</>}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ความนิยมรายเดือน — เดือนไหนมีคนใช้กี่คน */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-xs font-bold text-slate-800">ความนิยมรายเดือน</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">แต่ละเดือนมีผู้ใช้บันทึกรายการกี่คน</p>
          </div>
          <select
            value={String(popularityYear)}
            onChange={e => setPopularityYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">ทุกปีรวมกัน</option>
            {years.map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          {popularity.map(m => (
            <div key={m.month} className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0">{m.label}</span>
              <div className="flex-1 h-5 rounded-lg bg-slate-100 overflow-hidden relative min-w-0">
                <div
                  className={`h-full rounded-lg transition-all ${m.users > 0 ? 'bg-indigo-500' : ''}`}
                  style={{ width: `${m.pctOfPeak}%` }}
                />
                {m.users > 0 && (
                  <span className="absolute inset-y-0 left-2 flex items-center text-[9px] font-extrabold text-white drop-shadow-sm">
                    {m.users} คน
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-400 tabular-nums w-20 text-right shrink-0">
                {m.transactions.toLocaleString('th-TH')} รายการ
              </span>
            </div>
          ))}
        </div>

        {peakMonth && peakMonth.users > 0 && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5">
            <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
              เดือนที่มีผู้ใช้งานมากที่สุดคือ{' '}
              <span className="font-extrabold text-indigo-600">{peakMonth.label}</span> —{' '}
              {peakMonth.users} คน ({peakMonth.transactions.toLocaleString('th-TH')} รายการ)
            </p>
          </div>
        )}
      </div>

      {/* กราฟเทียบรายเดือน/รายปี ทั้งระบบ */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-4">
        <h3 className="text-xs font-bold text-slate-800">
          {view === 'month' ? `รายรับ–รายจ่ายรวม รายเดือน (พ.ศ. ${selectedYear + 543})` : 'รายรับ–รายจ่ายรวม รายปี'}
        </h3>
        <IncomeExpenseBar stats={scopeStats} />
        <ComparisonChart rows={rows} emptyText="ยังไม่มีข้อมูล" />
        <div className="border-t border-slate-100 pt-3">
          <ComparisonTable rows={rows} periodLabel={view === 'month' ? 'เดือน' : 'ปี'} />
        </div>
      </div>

      {/* ตารางรายผู้ใช้ */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-800">สรุปรายผู้ใช้ — {scopeLabel}</h3>
          <span className="text-[10px] font-bold text-slate-400">{users.length} คน</span>
        </div>

        {users.length === 0 ? (
          <p className="text-[11px] font-bold text-slate-400 text-center py-6">ยังไม่มีข้อมูลในช่วงนี้</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-2">ผู้ใช้</th>
                  <th className="py-2 px-2 text-right">รายรับ</th>
                  <th className="py-2 px-2 text-right">รายจ่าย</th>
                  <th className="py-2 px-2 text-right">คงเหลือ</th>
                  <th className="py-2 px-2 text-right">จ่าย/รับ</th>
                  <th className="py-2 px-2 text-right">รายการ</th>
                  <th className="py-2 pl-2 text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {users.map(u => {
                  const s = STATUS_STYLE[u.stats.status]
                  return (
                    <tr key={u.userId} className="hover:bg-slate-50/70 transition-all">
                      <td className="py-2.5 pr-2">
                        <span className="text-[11px] font-extrabold text-slate-700 font-mono">
                          {u.userId.slice(0, 8)}…
                        </span>
                        {u.lastActive && (
                          <span className="block text-[9px] font-bold text-slate-400">ล่าสุด {u.lastActive}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] font-bold text-emerald-600 tabular-nums text-right whitespace-nowrap">
                        ฿{fmtMoney(u.stats.income)}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] font-bold text-rose-600 tabular-nums text-right whitespace-nowrap">
                        ฿{fmtMoney(u.stats.expense)}
                      </td>
                      <td className={`py-2.5 px-2 text-[11px] font-extrabold tabular-nums text-right whitespace-nowrap ${s.text}`}>
                        {u.stats.net < 0 ? '-' : ''}฿{fmtMoney(Math.abs(u.stats.net))}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] font-bold text-slate-600 tabular-nums text-right">
                        {u.stats.income > 0 ? fmtPct(u.stats.expenseToIncomePct) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] font-bold text-slate-500 tabular-nums text-right">
                        {u.stats.count}
                      </td>
                      <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
                          {STATUS_SHORT[u.stats.status]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* หมวดยอดนิยมทั้งระบบ */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-3">
        <h3 className="text-xs font-bold text-slate-800">หมวดรายจ่ายยอดนิยมทั้งระบบ</h3>
        {topCats.length === 0 ? (
          <p className="text-[11px] font-bold text-slate-400 text-center py-6">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-2.5">
            {topCats.map(c => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{c.icon}</span>
                  <span className="text-[11px] font-bold text-slate-700 flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums">{c.count} รายการ</span>
                  <span className="text-[11px] font-extrabold text-rose-600 tabular-nums w-12 text-right">{fmtPct(c.pct)}</span>
                  <span className="text-[11px] font-extrabold text-slate-700 tabular-nums w-24 text-right">
                    ฿{fmtMoney(c.amount)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DistCard({
  icon,
  label,
  count,
  pct,
  tone,
}: {
  icon: React.ReactNode
  label: string
  count: number
  pct: number
  tone: 'emerald' | 'rose' | 'slate'
}) {
  const tones = {
    emerald: 'bg-emerald-50/60 border-emerald-100 text-emerald-600',
    rose: 'bg-rose-50/60 border-rose-100 text-rose-600',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
  }[tone]

  return (
    <div className={`rounded-2xl border p-3.5 space-y-1 ${tones}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-bold">{label}</p>
      </div>
      <p className="text-xl font-extrabold text-slate-800 tabular-nums">{fmtPct(pct)}</p>
      <p className="text-[10px] font-bold text-slate-400">{count} คน</p>
    </div>
  )
}
