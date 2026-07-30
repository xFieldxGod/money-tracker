import type { Transaction } from '@/types'
import { getCategoryName, getCategoryIcon } from '@/components/TransactionList'

/**
 * ตัวช่วยวิเคราะห์ข้อมูลรายรับ-รายจ่าย ใช้ร่วมกันระหว่างหน้าผู้ใช้ (/analytics)
 * และหน้าเจ้าของระบบ (/admin) — คำนวณล้วน ไม่ยุ่งกับ Firestore
 *
 * กติกา: ไม่นับรายการ transfer ในทุกสถิติ เพราะเป็นการย้ายเงินระหว่างเป๋าของ
 * คนเดียวกัน ไม่ใช่รายรับหรือรายจ่ายจริง
 */

export const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export const MONTH_NAMES_TH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** สถานะการเงิน: รายรับมากกว่า / รายจ่ายมากกว่า / เท่ากัน */
export type BalanceStatus = 'surplus' | 'deficit' | 'balanced'

export interface IncomeExpenseStats {
  income: number
  expense: number
  /** รายรับ − รายจ่าย */
  net: number
  /** รายรับ + รายจ่าย (ฐานสำหรับคิด % สัดส่วน) */
  total: number
  /** สัดส่วนรายรับต่อกระแสเงินรวม (%) */
  incomePct: number
  /** สัดส่วนรายจ่ายต่อกระแสเงินรวม (%) */
  expensePct: number
  /** รายจ่ายคิดเป็นกี่ % ของรายรับ — เกิน 100% = ใช้เกินตัว */
  expenseToIncomePct: number
  /** อัตราการออม = (รายรับ − รายจ่าย) / รายรับ × 100 */
  savingsRatePct: number
  status: BalanceStatus
  /** จำนวนรายการที่นับ (ไม่รวม transfer) */
  count: number
}

/** ปัดเป็นทศนิยม 1 ตำแหน่ง กันค่าอย่าง 33.333333 */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * ตัดสินสถานะจากส่วนต่าง โดยยอมให้คลาดเคลื่อนได้ 0.005 บาท
 * (กันเลขทศนิยมลอยตัวทำให้ยอดที่เท่ากันจริงกลายเป็น "รายรับมากกว่า")
 */
export function statusOf(net: number): BalanceStatus {
  if (Math.abs(net) < 0.005) return 'balanced'
  return net > 0 ? 'surplus' : 'deficit'
}

export const STATUS_LABEL: Record<BalanceStatus, string> = {
  surplus: 'รายรับมากกว่ารายจ่าย',
  deficit: 'รายจ่ายมากกว่ารายรับ',
  balanced: 'รายรับเท่ากับรายจ่าย',
}

export const STATUS_SHORT: Record<BalanceStatus, string> = {
  surplus: 'เงินเหลือ',
  deficit: 'เงินขาด',
  balanced: 'เท่ากัน',
}

/** คำนวณสถิติรายรับ-รายจ่ายจากชุดรายการ (ข้าม transfer) */
export function computeStats(transactions: Transaction[]): IncomeExpenseStats {
  let income = 0
  let expense = 0
  let count = 0

  for (const tx of transactions) {
    if (tx.type === 'income') {
      income += tx.amount
      count++
    } else if (tx.type === 'expense') {
      expense += tx.amount
      count++
    }
  }

  const net = income - expense
  const total = income + expense

  return {
    income,
    expense,
    net,
    total,
    incomePct: total > 0 ? round1((income / total) * 100) : 0,
    expensePct: total > 0 ? round1((expense / total) * 100) : 0,
    expenseToIncomePct: income > 0 ? round1((expense / income) * 100) : 0,
    savingsRatePct: income > 0 ? round1((net / income) * 100) : 0,
    status: statusOf(net),
    count,
  }
}

export interface MonthlyPoint {
  /** YYYY-MM */
  key: string
  year: number
  /** 1–12 */
  month: number
  label: string
  stats: IncomeExpenseStats
}

/** สรุปรายเดือนของปีที่ระบุ — คืนครบ 12 เดือนเสมอ เดือนที่ไม่มีข้อมูลเป็น 0 */
export function monthlyBreakdown(transactions: Transaction[], year: number): MonthlyPoint[] {
  const buckets: Transaction[][] = Array.from({ length: 12 }, () => [])

  for (const tx of transactions) {
    if (tx.type === 'transfer') continue
    const [y, m] = tx.date.split('-')
    if (Number(y) !== year) continue
    const idx = Number(m) - 1
    if (idx >= 0 && idx < 12) buckets[idx].push(tx)
  }

  return buckets.map((txs, i) => ({
    key: `${year}-${String(i + 1).padStart(2, '0')}`,
    year,
    month: i + 1,
    label: MONTH_NAMES_TH_SHORT[i],
    stats: computeStats(txs),
  }))
}

export interface YearlyPoint {
  year: number
  label: string
  stats: IncomeExpenseStats
}

/** สรุปรายปี เรียงจากปีเก่าไปใหม่ */
export function yearlyBreakdown(transactions: Transaction[]): YearlyPoint[] {
  const byYear = new Map<number, Transaction[]>()

  for (const tx of transactions) {
    if (tx.type === 'transfer') continue
    const year = Number(tx.date.slice(0, 4))
    if (!Number.isFinite(year)) continue
    const list = byYear.get(year)
    if (list) list.push(tx)
    else byYear.set(year, [tx])
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, txs]) => ({
      year,
      label: String(year + 543), // แสดงเป็น พ.ศ.
      stats: computeStats(txs),
    }))
}

/** ปีทั้งหมดที่มีข้อมูล เรียงจากใหม่ไปเก่า */
export function availableYears(transactions: Transaction[]): number[] {
  const years = new Set<number>()
  for (const tx of transactions) {
    const y = Number(tx.date.slice(0, 4))
    if (Number.isFinite(y)) years.add(y)
  }
  return [...years].sort((a, b) => b - a)
}

export interface CategoryStat {
  name: string
  icon: string
  amount: number
  pct: number
  count: number
}

/** จัดอันดับหมวดหมู่ตามยอดรวม (ประเภทเดียว: income หรือ expense) */
export function categoryRanking(
  transactions: Transaction[],
  type: 'income' | 'expense',
): CategoryStat[] {
  const byCat = new Map<string, { icon: string; amount: number; count: number }>()
  let total = 0

  for (const tx of transactions) {
    if (tx.type !== type) continue
    const name = getCategoryName(tx.category)
    const icon = getCategoryIcon(tx.category)
    total += tx.amount
    const entry = byCat.get(name)
    if (entry) {
      entry.amount += tx.amount
      entry.count++
      // รายการเก่าอาจไม่มีไอคอน — เจอไอคอนจริงเมื่อไหร่ให้ใช้อันนั้น
      if (entry.icon === '💳' && icon !== '💳') entry.icon = icon
    } else {
      byCat.set(name, { icon, amount: tx.amount, count: 1 })
    }
  }

  return [...byCat.entries()]
    .map(([name, v]) => ({
      name,
      icon: v.icon,
      amount: v.amount,
      pct: total > 0 ? round1((v.amount / total) * 100) : 0,
      count: v.count,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * เทียบสองช่วงเวลา — คืน % การเปลี่ยนแปลง
 * ถ้าฐานเป็น 0 จะคืน null เพราะคิด % ไม่ได้ (ให้ UI แสดงเป็น "ใหม่" แทน)
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return round1(((current - previous) / previous) * 100)
}

export interface PeriodComparison {
  current: { label: string; stats: IncomeExpenseStats }
  previous: { label: string; stats: IncomeExpenseStats }
  incomeChange: number | null
  expenseChange: number | null
  netChange: number | null
  /** ส่วนต่างของ "รายจ่ายคิดเป็นกี่ % ของรายรับ" เป็นจุดเปอร์เซ็นต์ (percentage point) */
  expenseRatioDiff: number | null
}

/**
 * เทียบสองช่วงล่าสุดที่มีข้อมูล (ใช้ได้ทั้งรายเดือนและรายปี)
 * ข้ามช่วงที่ไม่มีรายการเลย เพื่อไม่ให้เดือนว่างมาคั่นแล้วเทียบกับ 0
 */
export function comparePeriods(
  periods: { label: string; stats: IncomeExpenseStats }[],
): PeriodComparison | null {
  const active = periods.filter(p => p.stats.count > 0)
  if (active.length < 2) return null

  const current = active[active.length - 1]
  const previous = active[active.length - 2]

  return {
    current,
    previous,
    incomeChange: pctChange(current.stats.income, previous.stats.income),
    expenseChange: pctChange(current.stats.expense, previous.stats.expense),
    netChange: pctChange(current.stats.net, previous.stats.net),
    expenseRatioDiff:
      current.stats.income > 0 && previous.stats.income > 0
        ? round1(current.stats.expenseToIncomePct - previous.stats.expenseToIncomePct)
        : null,
  }
}

export interface MonthPopularity {
  month: number
  label: string
  /** จำนวนผู้ใช้ที่มีรายการอย่างน้อย 1 รายการในเดือนนี้ */
  users: number
  /** จำนวนรายการรวมของทุกคนในเดือนนี้ */
  transactions: number
  /** สัดส่วนผู้ใช้เทียบกับเดือนที่มีผู้ใช้มากที่สุด (%) — ใช้วาดแท่ง */
  pctOfPeak: number
}

/**
 * ความนิยมรายเดือน: เดือนไหนมีคนใช้งานกี่คน
 * รับ map ของ user_id → รายการของคนนั้น เพื่อให้นับผู้ใช้ไม่ซ้ำได้
 */
export function monthPopularity(
  byUser: Map<string, Transaction[]>,
  year: number | 'all',
): MonthPopularity[] {
  const userSets: Set<string>[] = Array.from({ length: 12 }, () => new Set())
  const txCounts = new Array(12).fill(0)

  for (const [userId, txs] of byUser) {
    for (const tx of txs) {
      const [y, m] = tx.date.split('-')
      if (year !== 'all' && Number(y) !== year) continue
      const idx = Number(m) - 1
      if (idx < 0 || idx > 11) continue
      userSets[idx].add(userId)
      txCounts[idx]++
    }
  }

  const counts = userSets.map(s => s.size)
  const peak = Math.max(...counts, 0)

  return counts.map((users, i) => ({
    month: i + 1,
    label: MONTH_NAMES_TH[i],
    users,
    transactions: txCounts[i],
    pctOfPeak: peak > 0 ? round1((users / peak) * 100) : 0,
  }))
}

export interface UserBreakdown {
  userId: string
  stats: IncomeExpenseStats
  /** วันที่ของรายการล่าสุด (YYYY-MM-DD) */
  lastActive: string | null
}

/** สรุปรายรับ-รายจ่ายแยกรายผู้ใช้ เรียงตามยอดกระแสเงินรวม */
export function perUserBreakdown(byUser: Map<string, Transaction[]>): UserBreakdown[] {
  return [...byUser.entries()]
    .map(([userId, txs]) => {
      let lastActive: string | null = null
      for (const tx of txs) {
        if (!lastActive || tx.date > lastActive) lastActive = tx.date
      }
      return { userId, stats: computeStats(txs), lastActive }
    })
    .sort((a, b) => b.stats.total - a.stats.total)
}

export interface StatusDistribution {
  surplus: number
  deficit: number
  balanced: number
  total: number
  surplusPct: number
  deficitPct: number
  balancedPct: number
}

/** กระจายตัวของผู้ใช้ตามสถานะการเงิน — ตอบ "กี่ % ของคนที่รายจ่ายมากกว่ารายรับ" */
export function statusDistribution(users: UserBreakdown[]): StatusDistribution {
  let surplus = 0
  let deficit = 0
  let balanced = 0

  for (const u of users) {
    // ผู้ใช้ที่ไม่มีรายการเลยไม่นับเข้าการกระจายตัว
    if (u.stats.count === 0) continue
    if (u.stats.status === 'surplus') surplus++
    else if (u.stats.status === 'deficit') deficit++
    else balanced++
  }

  const total = surplus + deficit + balanced

  return {
    surplus,
    deficit,
    balanced,
    total,
    surplusPct: total > 0 ? round1((surplus / total) * 100) : 0,
    deficitPct: total > 0 ? round1((deficit / total) * 100) : 0,
    balancedPct: total > 0 ? round1((balanced / total) * 100) : 0,
  }
}
