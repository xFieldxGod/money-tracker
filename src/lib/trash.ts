import type { Transaction } from '@/types'

export const TRASH_RETENTION_DAYS = 5

export interface TrashMonthGroup {
  monthKey: string
  month: Date
  count: number
  deletedAt: string
  daysLeft: number
}

export function isActiveTransaction(tx: Transaction): boolean {
  return !tx.deleted_at
}

export function trashExpiresAt(deletedAt: string): Date {
  const d = new Date(deletedAt)
  d.setDate(d.getDate() + TRASH_RETENTION_DAYS)
  return d
}

export function daysUntilTrashExpires(deletedAt: string): number {
  const ms = trashExpiresAt(deletedAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export function isTrashExpired(deletedAt: string): boolean {
  return daysUntilTrashExpires(deletedAt) <= 0
}

export function groupTrashByMonth(txs: Transaction[]): TrashMonthGroup[] {
  const map = new Map<string, { count: number; deletedAt: string }>()
  for (const tx of txs) {
    if (!tx.deleted_at) continue
    const key = tx.date.slice(0, 7)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { count: 1, deletedAt: tx.deleted_at })
    } else {
      existing.count++
      if (tx.deleted_at < existing.deletedAt) existing.deletedAt = tx.deleted_at
    }
  }
  return [...map.entries()]
    .map(([monthKey, { count, deletedAt }]) => ({
      monthKey,
      month: new Date(`${monthKey}-01T00:00:00`),
      count,
      deletedAt,
      daysLeft: daysUntilTrashExpires(deletedAt),
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}
