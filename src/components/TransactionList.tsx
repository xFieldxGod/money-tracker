'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { Transaction } from '@/types'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types'
import { signedAmount, walletName } from '@/lib/wallets'
import ConfirmDialog from './ConfirmDialog'
import type { Wallet } from '@/types'
import { Inbox, ArrowLeftRight, Trash2, Loader2 } from 'lucide-react'

interface Props {
  transactions: Transaction[]
  onDelete: (id: string) => Promise<void>
  onEdit: (tx: Transaction) => void
  wallets: Wallet[]
  selectedWalletId: 'all' | string
}

// custom category format: "emoji name" — อีโมจิหนึ่งตัวอาจยาวหลาย code point
// (surrogate pair เช่น 🥤, variation selector เช่น 🏋️) ห้ามใช้ str[0] เด็ดขาด
const EMOJI_PREFIX_RE = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Component}]*/u

export function getCategoryIcon(category: string) {
  const preset = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find(c => c.name === category)
  if (preset) return preset.icon
  const m = category.trimStart().match(EMOJI_PREFIX_RE)
  if (m) return m[0]
  return '💳'
}

export function getCategoryName(category: string) {
  const preset = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find(c => c.name === category)
  if (preset) return preset.name
  const trimmed = category.trim()
  const m = trimmed.match(EMOJI_PREFIX_RE)
  if (m) return trimmed.slice(m[0].length).trim()
  return trimmed
}

export default function TransactionList({ transactions, onDelete, onEdit, wallets, selectedWalletId }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setConfirmId(id)
  }

  async function handleConfirmDelete() {
    if (!confirmId) return
    setDeletingId(confirmId)
    setConfirmId(null)
    await onDelete(confirmId)
    setDeletingId(null)
  }

  const confirmTx = confirmId ? transactions.find(t => t.id === confirmId) : null

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-[28px] p-10 text-center border border-slate-200/50 shadow-premium">
        <div className="w-16 h-16 mx-auto mb-4 rounded-[20px] bg-slate-50 flex items-center justify-center shadow-inner">
          <Inbox className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-slate-700 font-bold text-sm">ยังไม่มีรายการในเดือนนี้</p>
        <p className="text-slate-400 text-xs mt-1.5 font-medium">เริ่มต้นบันทึกรายรับรายจ่ายได้ด้วยปุ่ม + บันทึก</p>
      </div>
    )
  }

  const grouped: Record<string, Transaction[]> = {}
  for (const t of transactions) {
    if (!grouped[t.date]) grouped[t.date] = []
    grouped[t.date].push(t)
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, items]) => {
        const dayTotal = items.reduce((s, t) => s + signedAmount(t, selectedWalletId, wallets), 0)
        return (
          <div key={date} className="bg-white rounded-[24px] border border-slate-200/40 shadow-premium overflow-hidden transition-all hover:shadow-premium-lg">
            {/* Bank-App Style Clean Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 border-b border-slate-200/20">
              <p className="text-xs font-bold text-slate-500">
                {format(new Date(date), 'EEEE d MMMM yyyy', { locale: th })}
              </p>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border tabular-nums shadow-sm ${
                dayTotal >= 0 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' 
                  : 'bg-rose-50 text-rose-600 border-rose-100/50'
              }`}>
                {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {/* Item List */}
            <div className="divide-y divide-slate-100/50">
              {items.map(t => {
                const amount = signedAmount(t, selectedWalletId, wallets)
                const fromWallet = walletName(t.wallet_id, wallets)
                const toWallet = walletName(t.to_wallet_id, wallets)
                const isTransfer = t.type === 'transfer'
                const amountClass = isTransfer
                  ? selectedWalletId === 'all' || amount === 0
                    ? 'text-slate-500'
                    : amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                  : t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                return (
                  <div
                    key={t.id}
                    onClick={() => onEdit(t)}
                    className="flex items-center gap-4 px-5 py-3.5 active:bg-slate-50/50 hover:bg-slate-50/30 transition-all cursor-pointer group"
                  >
                    {/* Category icon block */}
                    <div className={`w-11 h-11 rounded-[16px] flex items-center justify-center flex-shrink-0 text-xl border transition-all ${
                      isTransfer
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100/30'
                        : t.type === 'income'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100/30'
                          : 'bg-rose-50 text-rose-600 border-rose-100/30'
                    }`}>
                      {isTransfer ? <ArrowLeftRight className="w-5 h-5 text-indigo-600" /> : getCategoryIcon(t.category)}
                    </div>

                    {/* Title & note */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm tracking-tight">
                        {isTransfer ? 'โอนเงิน' : getCategoryName(t.category)}
                      </p>
                      {isTransfer ? (
                        <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">
                          {fromWallet.icon} {fromWallet.name} → {toWallet.icon} {toWallet.name}
                        </p>
                      ) : t.note ? (
                        <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">{t.note}</p>
                      ) : (
                        <p className="text-[10px] text-slate-300 truncate mt-0.5 font-medium">ไม่มีบันทึกโน้ต</p>
                      )}
                    </div>

                    {/* Amount with sign */}
                    <span className={`font-extrabold text-sm sm:text-base flex-shrink-0 tabular-nums ${amountClass}`}>
                      {isTransfer
                        ? selectedWalletId === 'all' || amount === 0 ? '' : amount > 0 ? '+' : '-'
                        : t.type === 'income' ? '+' : '-'}
                      {Math.abs(isTransfer ? (selectedWalletId === 'all' ? t.amount : amount) : t.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>

                    {/* Sleek delete button */}
                    <button
                      onClick={(e) => handleDeleteClick(e, t.id)}
                      disabled={deletingId === t.id}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50/60 hover:border hover:border-rose-100/50 transition-all flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {confirmTx && (
        <ConfirmDialog
          message={
            confirmTx.type === 'transfer' ? (
              <span className="flex items-center justify-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500 inline" />
                <span>โอนเงิน · {confirmTx.amount.toLocaleString('th-TH')} บาท</span>
              </span>
            ) : (
              `${getCategoryIcon(confirmTx.category)} ${getCategoryName(confirmTx.category)} · ${confirmTx.amount.toLocaleString('th-TH')} บาท`
            )
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
