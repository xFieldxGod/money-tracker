'use client'

import { useState } from 'react'
import DatePicker from '@/components/DatePicker'

interface Props {
  onSubmit: (data: { lender: string; amount: number; borrow_date: string; due_date: string | null; note: string | null }) => Promise<void>
  onClose: () => void
}

export default function DebtForm({ onSubmit, onClose }: Props) {
  const [lender, setLender] = useState('')
  const [amount, setAmount] = useState('')
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!lender.trim() || isNaN(amt) || amt <= 0) return
    setSaving(true)
    await onSubmit({
      lender: lender.trim(),
      amount: amt,
      borrow_date: borrowDate,
      due_date: dueDate || null,
      note: note.trim() || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">บันทึกการยืมเงิน</h2>
            <p className="text-xs text-slate-400 mt-0.5">ยืมเงินจากใคร เท่าไหร่</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lender */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">ชื่อเจ้าหนี้ *</label>
            <input
              type="text"
              value={lender}
              onChange={e => setLender(e.target.value)}
              placeholder="เช่น แม่, เพื่อน, ธนาคาร"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">ยอดเงินที่ยืม (บาท) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">฿</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                step="0.01"
                className="w-full border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          {/* Borrow date */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">วันที่ยืม *</label>
            <DatePicker value={borrowDate} onChange={setBorrowDate} />
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">
              วันที่ต้องคืน <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
            </label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">
              หมายเหตุ <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="บันทึกเพิ่มเติม..."
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-rose-100 disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกการยืมเงิน'}
          </button>
        </form>
      </div>
    </div>
  )
}
