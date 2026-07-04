'use client'

import { useMemo, useState } from 'react'
import type { Transaction, Wallet } from '@/types'
import { resolveWalletId } from '@/lib/wallets'
import DatePicker from './DatePicker'

interface Props {
  wallets: Wallet[]
  onSubmit: (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onClose: () => void
  initialData?: Transaction
}

function firstOtherWallet(wallets: Wallet[], id: string) {
  return wallets.find(w => w.id !== id)?.id ?? wallets[0]?.id ?? 'main'
}

export default function TransferForm({ wallets, onSubmit, onClose, initialData }: Props) {
  const initialFrom = resolveWalletId(initialData?.wallet_id, wallets)
  const initialTo = initialData?.to_wallet_id
    ? resolveWalletId(initialData.to_wallet_id, wallets)
    : firstOtherWallet(wallets, initialFrom)

  const [fromWalletId, setFromWalletId] = useState(initialFrom)
  const [toWalletId, setToWalletId] = useState(initialTo === initialFrom ? firstOtherWallet(wallets, initialFrom) : initialTo)
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? '')
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(initialData?.note ?? '')
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => {
    const parsed = parseFloat(amount)
    return Number.isFinite(parsed) && parsed > 0 && fromWalletId !== toWalletId && wallets.length > 1
  }, [amount, fromWalletId, toWalletId, wallets.length])

  function selectFrom(id: string) {
    setFromWalletId(id)
    if (id === toWalletId) setToWalletId(firstOtherWallet(wallets, id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    await onSubmit({
      type: 'transfer',
      amount: parseFloat(amount),
      category: 'โอนเงิน',
      note: note || null,
      date,
      wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-[28px] w-full max-w-md shadow-premium-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
          <h2 className="font-extrabold text-slate-800 tracking-tight text-base">
            {initialData ? '🔁 แก้ไขรายการโอน' : '🔁 โอนข้ามเป๋า'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center text-sm leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">จากเป๋า</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {wallets.map(wallet => (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => selectFrom(wallet.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    fromWalletId === wallet.id
                      ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {wallet.icon} {wallet.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">ไปยังเป๋า</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {wallets.map(wallet => (
                <button
                  key={wallet.id}
                  type="button"
                  disabled={wallet.id === fromWalletId}
                  onClick={() => setToWalletId(wallet.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-extrabold transition-all ${
                    wallet.id === fromWalletId
                      ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      : toWalletId === wallet.id
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm cursor-pointer'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  {wallet.icon} {wallet.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">จำนวนเงิน (THB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-lg">฿</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl pl-9 pr-4 py-3.5 text-lg font-extrabold text-slate-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">วันที่โอน</label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">หมายเหตุ</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น ย้ายเงินเข้าบัญชีออม"
              className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 active:scale-[0.99] cursor-pointer mt-2"
          >
            {loading ? '⏳ กำลังบันทึกข้อมูล...' : initialData ? '✓ บันทึกการแก้ไข' : '✓ ยืนยันการโอน'}
          </button>
        </form>
      </div>
    </div>
  )
}
