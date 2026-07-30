'use client'

import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { isActiveTransaction } from '@/lib/trash'
import { txMatchesWallet } from '@/lib/wallets'
import { useWallets } from '@/lib/useWallets'
import { useAdmin } from '@/lib/useAdmin'
import type { Transaction } from '@/types'
import {
  computeStats, monthlyBreakdown, yearlyBreakdown, availableYears,
  categoryRanking, comparePeriods, MONTH_NAMES_TH, STATUS_LABEL,
} from '@/lib/analytics'
import { StatsRow, StatusBadge, IncomeExpenseBar, fmtMoney, fmtPct, STATUS_STYLE } from './analytics/StatPills'
import { ComparisonChart, ComparisonTable, type ComparisonRow } from './analytics/ComparisonChart'
import { ChartPie, ArrowLeft, Shield, CalendarDays, Wallet as WalletIcon } from 'lucide-react'

type View = 'month' | 'year'

export default function AnalyticsClient({ userId }: { userId: string }) {
  const { wallets } = useWallets(userId)
  const { isAdmin } = useAdmin(userId)
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('month')
  const [pickedYear, setPickedYear] = useState<number>(() => new Date().getFullYear())
  const [selectedWalletId, setSelectedWalletId] = useState<'all' | string>('all')

  // ดึงรายการทั้งหมดของผู้ใช้ครั้งเดียว แล้วคำนวณทุกมุมมองในเครื่อง
  useEffect(() => {
    let cancelled = false
    const q = query(collection(db, 'transactions'), where('user_id', '==', userId))
    getDocs(q)
      .then(snap => {
        if (cancelled) return
        setAllTx(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)).filter(isActiveTransaction))
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const walletTx = useMemo(
    () => allTx.filter(tx => txMatchesWallet(tx, selectedWalletId, wallets)),
    [allTx, selectedWalletId, wallets]
  )

  const years = useMemo(() => {
    const found = availableYears(walletTx)
    // ให้มีปีปัจจุบันติดอยู่เสมอ ถึงจะยังไม่มีรายการก็เลือกดูได้
    const current = new Date().getFullYear()
    return found.includes(current) ? found : [current, ...found]
  }, [walletTx])

  // ถ้าปีที่เลือกอยู่หายไปจากลิสต์ (เช่นสลับกระเป๋าแล้วปีนั้นไม่มีข้อมูล)
  // ให้ตกกลับไปปีล่าสุดที่มี — คำนวณตอน render ไม่ต้องใช้ effect แก้ state
  const selectedYear = years.includes(pickedYear) ? pickedYear : (years[0] ?? pickedYear)

  const yearTx = useMemo(
    () => walletTx.filter(tx => Number(tx.date.slice(0, 4)) === selectedYear),
    [walletTx, selectedYear]
  )

  const months = useMemo(() => monthlyBreakdown(walletTx, selectedYear), [walletTx, selectedYear])
  const yearsData = useMemo(() => yearlyBreakdown(walletTx), [walletTx])

  // สถิติของช่วงที่กำลังดูอยู่: รายเดือน = ทั้งปีที่เลือก, รายปี = ทุกปีรวมกัน
  const scopeTx = view === 'month' ? yearTx : walletTx
  const scopeStats = useMemo(() => computeStats(scopeTx), [scopeTx])

  const rows: ComparisonRow[] = useMemo(() => {
    if (view === 'month') {
      return months.map(m => ({ key: m.key, label: m.label, stats: m.stats }))
    }
    return yearsData.map(y => ({ key: String(y.year), label: `พ.ศ. ${y.label}`, stats: y.stats }))
  }, [view, months, yearsData])

  // เดือนที่ใช้จ่ายสูงสุด / เก็บออมได้ดีที่สุด ในปีที่เลือก
  const highlights = useMemo(() => {
    const active = months.filter(m => m.stats.count > 0)
    if (active.length === 0) return null
    const topSpend = active.reduce((a, b) => (b.stats.expense > a.stats.expense ? b : a))
    const bestSave = active.reduce((a, b) => (b.stats.net > a.stats.net ? b : a))
    const busiest = active.reduce((a, b) => (b.stats.count > a.stats.count ? b : a))
    return { topSpend, bestSave, busiest, activeCount: active.length }
  }, [months])

  // เทียบสองช่วงล่าสุดที่มีข้อมูล — เดือนกับเดือน หรือปีกับปี ตามมุมมองที่เลือก
  const comparison = useMemo(() => {
    if (view === 'month') {
      return comparePeriods(months.map(m => ({ label: MONTH_NAMES_TH[m.month - 1], stats: m.stats })))
    }
    return comparePeriods(yearsData.map(y => ({ label: `พ.ศ. ${y.label}`, stats: y.stats })))
  }, [view, months, yearsData])

  const topExpenseCats = useMemo(() => categoryRanking(scopeTx, 'expense').slice(0, 6), [scopeTx])
  const topIncomeCats = useMemo(() => categoryRanking(scopeTx, 'income').slice(0, 6), [scopeTx])

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-9 w-48 bg-slate-200/80 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <div key={i} className="h-24 bg-white border border-slate-200/40 rounded-[20px] animate-pulse shadow-premium" />)}
        </div>
        <div className="h-64 bg-white border border-slate-200/40 rounded-[24px] animate-pulse shadow-premium" />
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
            <ChartPie className="w-6 h-6 text-indigo-500" /> วิเคราะห์การเงิน
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            เทียบสัดส่วนรายรับ–รายจ่าย รายเดือนและรายปี
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl transition-all"
            >
              <Shield className="w-3.5 h-3.5" /> <span className="hidden sm:inline">แอดมิน</span>
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">หน้าหลัก</span>
          </Link>
        </div>
      </div>

      {/* ตัวกรอง: มุมมอง / ปี / กระเป๋า */}
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
              {years.map(y => (
                <option key={y} value={y}>พ.ศ. {y + 543}</option>
              ))}
            </select>
          </div>
        )}

        {wallets.length > 0 && (
          <div className="flex items-center gap-1.5">
            <WalletIcon className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedWalletId}
              onChange={e => setSelectedWalletId(e.target.value)}
              className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">ทุกกระเป๋า</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* สรุปภาพรวมของช่วงที่เลือก */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap pl-1">
          <h3 className="text-xs font-bold text-slate-400">ภาพรวม — {scopeLabel}</h3>
          {scopeStats.count > 0 && <StatusBadge status={scopeStats.status} />}
        </div>
        <StatsRow stats={scopeStats} />
      </div>

      {/* แถบสัดส่วน + ข้อสรุปเป็นภาษาคน */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-4">
        <h3 className="text-xs font-bold text-slate-800">สัดส่วนรายรับ–รายจ่าย</h3>
        <IncomeExpenseBar stats={scopeStats} />

        {scopeStats.count > 0 ? (
          <div className={`rounded-2xl border p-3.5 space-y-1.5 ${STATUS_STYLE[scopeStats.status].bg} ${STATUS_STYLE[scopeStats.status].border}`}>
            <p className={`text-xs font-extrabold ${STATUS_STYLE[scopeStats.status].text}`}>
              {STATUS_LABEL[scopeStats.status]}
            </p>
            <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
              {scopeStats.income > 0 ? (
                <>
                  ช่วง{scopeLabel} คุณมีรายรับ ฿{fmtMoney(scopeStats.income)} และรายจ่าย ฿{fmtMoney(scopeStats.expense)} —
                  รายจ่ายคิดเป็น <span className="font-extrabold">{fmtPct(scopeStats.expenseToIncomePct)}</span> ของรายรับ
                  {scopeStats.status === 'surplus'
                    ? ` เก็บออมได้ ${fmtPct(scopeStats.savingsRatePct)} ของรายรับ`
                    : scopeStats.status === 'deficit'
                      ? ` ใช้เกินรายรับอยู่ ฿${fmtMoney(Math.abs(scopeStats.net))}`
                      : ' พอดีกันเป๊ะ'}
                </>
              ) : (
                <>ช่วง{scopeLabel} มีแต่รายจ่าย ฿{fmtMoney(scopeStats.expense)} ยังไม่ได้บันทึกรายรับ</>
              )}
            </p>
          </div>
        ) : (
          <p className="text-[11px] font-bold text-slate-400 text-center py-2">ยังไม่มีข้อมูลในช่วงนี้</p>
        )}
      </div>

      {/* กราฟเทียบ */}
      <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-4">
        <h3 className="text-xs font-bold text-slate-800">
          {view === 'month' ? `เทียบรายเดือน — พ.ศ. ${selectedYear + 543}` : 'เทียบรายปี'}
        </h3>
        <ComparisonChart
          rows={rows}
          emptyText={view === 'month' ? 'ยังไม่มีรายการในปีนี้' : 'ยังไม่มีรายการ'}
        />
        <div className="border-t border-slate-100 pt-3">
          <ComparisonTable rows={rows} periodLabel={view === 'month' ? 'เดือน' : 'ปี'} />
        </div>
      </div>

      {/* ไฮไลต์รายเดือน */}
      {view === 'month' && highlights && (
        <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-3">
          <h3 className="text-xs font-bold text-slate-800">ข้อสังเกตจากข้อมูล</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3 space-y-1">
              <p className="text-[10px] font-bold text-rose-500">เดือนที่ใช้จ่ายมากสุด</p>
              <p className="text-sm font-extrabold text-slate-800">{MONTH_NAMES_TH[highlights.topSpend.month - 1]}</p>
              <p className="text-[10px] font-bold text-slate-500 tabular-nums">฿{fmtMoney(highlights.topSpend.stats.expense)}</p>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 space-y-1">
              <p className="text-[10px] font-bold text-emerald-600">เดือนที่เหลือเงินมากสุด</p>
              <p className="text-sm font-extrabold text-slate-800">{MONTH_NAMES_TH[highlights.bestSave.month - 1]}</p>
              <p className="text-[10px] font-bold text-slate-500 tabular-nums">
                {highlights.bestSave.stats.net < 0 ? '-' : ''}฿{fmtMoney(Math.abs(highlights.bestSave.stats.net))}
              </p>
            </div>
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 space-y-1">
              <p className="text-[10px] font-bold text-indigo-600">เดือนที่บันทึกบ่อยสุด</p>
              <p className="text-sm font-extrabold text-slate-800">{MONTH_NAMES_TH[highlights.busiest.month - 1]}</p>
              <p className="text-[10px] font-bold text-slate-500 tabular-nums">{highlights.busiest.stats.count} รายการ</p>
            </div>
          </div>

        </div>
      )}

      {/* เทียบช่วงล่าสุดกับช่วงก่อนหน้า — ใช้ได้ทั้งรายเดือนและรายปี */}
      {comparison && (
        <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-bold text-slate-800">
              เทียบ{view === 'month' ? 'เดือนล่าสุด' : 'ปีล่าสุด'}กับ{view === 'month' ? 'เดือน' : 'ปี'}ก่อนหน้า
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              {comparison.previous.label} → {comparison.current.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <CompareCell
              label="รายรับ"
              current={comparison.current.stats.income}
              previous={comparison.previous.stats.income}
              change={comparison.incomeChange}
              goodWhenUp
            />
            <CompareCell
              label="รายจ่าย"
              current={comparison.current.stats.expense}
              previous={comparison.previous.stats.expense}
              change={comparison.expenseChange}
              goodWhenUp={false}
            />
            <CompareCell
              label="คงเหลือสุทธิ"
              current={comparison.current.stats.net}
              previous={comparison.previous.stats.net}
              change={comparison.netChange}
              goodWhenUp
            />
          </div>

          {/* สรุปเป็นประโยคว่าดีขึ้นหรือแย่ลง */}
          {comparison.expenseRatioDiff !== null && (
            <div
              className={`rounded-2xl border p-3.5 ${
                comparison.expenseRatioDiff <= 0
                  ? 'bg-emerald-50/60 border-emerald-100'
                  : 'bg-rose-50/60 border-rose-100'
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                สัดส่วนรายจ่ายต่อรายรับ{' '}
                {comparison.expenseRatioDiff === 0 ? (
                  <>เท่าเดิมที่ <span className="font-extrabold">{fmtPct(comparison.current.stats.expenseToIncomePct)}</span></>
                ) : (
                  <>
                    <span className={`font-extrabold ${comparison.expenseRatioDiff < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {comparison.expenseRatioDiff < 0 ? 'ลดลง' : 'เพิ่มขึ้น'} {fmtPct(Math.abs(comparison.expenseRatioDiff))}
                    </span>{' '}
                    จาก {fmtPct(comparison.previous.stats.expenseToIncomePct)} เป็น{' '}
                    {fmtPct(comparison.current.stats.expenseToIncomePct)}
                  </>
                )}
                {comparison.expenseRatioDiff < 0 && ' — ใช้จ่ายประหยัดขึ้น'}
                {comparison.expenseRatioDiff > 0 && ' — ใช้จ่ายมากขึ้นเมื่อเทียบกับรายรับ'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* อันดับหมวดหมู่ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPanel title="หมวดที่จ่ายมากที่สุด" cats={topExpenseCats} tone="rose" />
        <CategoryPanel title="หมวดที่รับเข้ามากที่สุด" cats={topIncomeCats} tone="emerald" />
      </div>
    </div>
  )
}

/** ช่องเทียบตัวเลขช่วงปัจจุบัน vs ช่วงก่อนหน้า พร้อม % การเปลี่ยนแปลง */
function CompareCell({
  label,
  current,
  previous,
  change,
  goodWhenUp,
}: {
  label: string
  current: number
  previous: number
  change: number | null
  goodWhenUp: boolean
}) {
  // ขึ้นแล้วดีไหม ขึ้นกับว่าเป็นรายรับ (ขึ้น=ดี) หรือรายจ่าย (ขึ้น=แย่)
  const up = change !== null && change > 0
  const flat = change === null || change === 0
  const good = up === goodWhenUp
  const tone = flat
    ? 'text-slate-500 bg-slate-50 border-slate-200'
    : good
      ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
      : 'text-rose-600 bg-rose-50 border-rose-100'

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border tabular-nums ${tone}`}>
          {change === null ? 'ใหม่' : change === 0 ? '— 0%' : `${up ? '▲' : '▼'} ${fmtPct(Math.abs(change))}`}
        </span>
      </div>
      <p className="text-sm font-extrabold text-slate-800 tabular-nums">
        {current < 0 ? '-' : ''}฿{fmtMoney(Math.abs(current))}
      </p>
      <p className="text-[10px] font-bold text-slate-400 tabular-nums">
        เดิม {previous < 0 ? '-' : ''}฿{fmtMoney(Math.abs(previous))}
      </p>
    </div>
  )
}

function CategoryPanel({
  title,
  cats,
  tone,
}: {
  title: string
  cats: { name: string; icon: string; amount: number; pct: number; count: number }[]
  tone: 'rose' | 'emerald'
}) {
  const bar = tone === 'rose' ? 'bg-rose-500' : 'bg-emerald-500'
  const text = tone === 'rose' ? 'text-rose-600' : 'text-emerald-600'

  return (
    <div className="bg-white border border-slate-200/45 rounded-[24px] p-5 shadow-premium space-y-3">
      <h3 className="text-xs font-bold text-slate-800">{title}</h3>
      {cats.length === 0 ? (
        <p className="text-[11px] font-bold text-slate-400 text-center py-6">ยังไม่มีข้อมูล</p>
      ) : (
        <div className="space-y-2.5">
          {cats.map(c => (
            <div key={c.name} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{c.icon}</span>
                <span className="text-[11px] font-bold text-slate-700 flex-1 truncate">{c.name}</span>
                <span className={`text-[11px] font-extrabold tabular-nums ${text}`}>{fmtPct(c.pct)}</span>
                <span className="text-[11px] font-extrabold text-slate-700 tabular-nums w-20 text-right">
                  ฿{fmtMoney(c.amount)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
