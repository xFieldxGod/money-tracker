'use client'

import { useState } from 'react'
import type { Debt } from '@/types'
import { differenceInDays, parseISO, format } from 'date-fns'
import { th } from 'date-fns/locale'
import DatePicker from '@/components/DatePicker'

function fmtDate(dateStr: string) {
  return format(new Date(dateStr + 'T00:00:00'), 'd MMM yyyy', { locale: th })
}

interface PaymentFormState {
  debtId: string
  amount: string
  note: string
  date: string
}

interface EditFormState {
  debtId: string
  lender: string
  amount: string
  borrow_date: string
  due_date: string
  note: string
}

interface Props {
  debts: Debt[]
  onAddPayment: (debtId: string, amount: number, note: string | null, date: string) => Promise<void>
  onMarkPaid: (debtId: string) => Promise<void>
  onDelete: (debtId: string) => Promise<void>
  onEdit: (debtId: string, data: { lender: string; amount: number; borrow_date: string; due_date: string | null; note: string | null }) => Promise<void>
}

function DebtProgress({ debt }: { debt: Debt }) {
  const pct = Math.min((debt.paid / debt.amount) * 100, 100)
  const remaining = debt.amount - debt.paid

  return (
    <div className="mt-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[11px] font-bold text-slate-500">คืนแล้ว</span>
        <span className="text-[11px] font-bold text-indigo-600">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-400 to-indigo-600"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-slate-400">คืนแล้ว ฿{debt.paid.toLocaleString('th-TH')}</span>
        <span className="text-[10px] font-bold text-rose-500">ค้างอยู่ ฿{remaining.toLocaleString('th-TH')}</span>
      </div>
    </div>
  )
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const days = differenceInDays(parseISO(dueDate), new Date())
  if (days < 0) return (
    <span className="text-[10px] font-bold bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full">
      เกินกำหนด {Math.abs(days)} วัน
    </span>
  )
  if (days <= 7) return (
    <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
      อีก {days} วัน
    </span>
  )
  return (
    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
      ครบ {dueDate}
    </span>
  )
}

export default function DebtList({ debts, onAddPayment, onMarkPaid, onDelete, onEdit }: Props) {
  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function submitEdit() {
    if (!editForm) return
    const amt = parseFloat(editForm.amount)
    if (isNaN(amt) || amt <= 0 || !editForm.lender.trim()) return
    setSaving(true)
    await onEdit(editForm.debtId, {
      lender: editForm.lender.trim(),
      amount: amt,
      borrow_date: editForm.borrow_date,
      due_date: editForm.due_date || null,
      note: editForm.note.trim() || null,
    })
    setSaving(false)
    setEditForm(null)
  }

  const active = debts.filter(d => d.status === 'active')
  const paid = debts.filter(d => d.status === 'paid')

  async function submitPayment() {
    if (!paymentForm) return
    const amt = parseFloat(paymentForm.amount)
    if (isNaN(amt) || amt <= 0) return
    setSaving(true)
    await onAddPayment(paymentForm.debtId, amt, paymentForm.note || null, paymentForm.date)
    setSaving(false)
    setPaymentForm(null)
  }

  if (debts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
        <p className="text-4xl mb-3">🎉</p>
        <p className="font-bold text-slate-700 mb-1">ไม่มีหนี้สิน</p>
        <p className="text-sm text-slate-400">กดปุ่ม + เพื่อบันทึกการยืมเงิน</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active debts */}
      {active.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            ค้างอยู่ · {active.length} รายการ
          </h3>
          <div className="space-y-3">
            {active.map(debt => (
              <div key={debt.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                {/* Main row */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-xl flex-shrink-0">
                        🏦
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-900 text-sm truncate">{debt.lender}</p>
                        <p className="text-xs text-slate-400 mt-0.5">ยืมเมื่อ {fmtDate(debt.borrow_date)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-rose-500 text-base">฿{debt.amount.toLocaleString('th-TH')}</p>
                      {debt.due_date && <DueBadge dueDate={debt.due_date} />}
                    </div>
                  </div>

                  {debt.note && (
                    <p className="text-xs text-slate-400 mt-2 pl-13">{debt.note}</p>
                  )}

                  <DebtProgress debt={debt} />

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setPaymentForm({ debtId: debt.id, amount: '', note: '', date: new Date().toISOString().slice(0, 10) })}
                      className="flex-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      + บันทึกการคืน
                    </button>
                    <button
                      onClick={() => onMarkPaid(debt.id)}
                      className="flex-1 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      ✓ คืนครบแล้ว
                    </button>
                    <button
                      onClick={() => setEditForm({ debtId: debt.id, lender: debt.lender, amount: String(debt.amount), borrow_date: debt.borrow_date, due_date: debt.due_date ?? '', note: debt.note ?? '' })}
                      className="px-3 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-500 rounded-xl transition-all cursor-pointer"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === debt.id ? null : debt.id)}
                      className="px-3 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all cursor-pointer"
                    >
                      {expandedId === debt.id ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Payment history */}
                {expandedId === debt.id && debt.payments.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ประวัติการคืน</p>
                    {debt.payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="text-slate-500">{fmtDate(p.date)}</span>
                          {p.note && <span className="text-slate-400">· {p.note}</span>}
                        </div>
                        <span className="font-bold text-indigo-600">฿{p.amount.toLocaleString('th-TH')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delete */}
                <div className="border-t border-slate-100 px-4 py-2 flex justify-end">
                  <button
                    onClick={() => setDeletingId(debt.id)}
                    className="text-[11px] text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    ลบรายการนี้
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Paid debts */}
      {paid.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            คืนแล้ว · {paid.length} รายการ
          </h3>
          <div className="space-y-2">
            {paid.map(debt => (
              <div key={debt.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between opacity-70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">✅</div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{debt.lender}</p>
                    <p className="text-xs text-slate-400">ยืมเมื่อ {fmtDate(debt.borrow_date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-emerald-600 text-sm">฿{debt.amount.toLocaleString('th-TH')}</p>
                  <button
                    onClick={() => setDeletingId(debt.id)}
                    className="text-[10px] text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment modal */}
      {paymentForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPaymentForm(null)} />
          <div className="relative w-full sm:max-w-sm bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl p-6 z-10">
            <h2 className="text-base font-extrabold text-slate-900 mb-4">บันทึกการคืนเงิน</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">จำนวนเงิน (บาท) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">฿</span>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0"
                    min="1"
                    className="w-full border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">วันที่</label>
                <DatePicker
                  value={paymentForm.date}
                  onChange={date => setPaymentForm({ ...paymentForm, date })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">หมายเหตุ</label>
                <input
                  type="text"
                  value={paymentForm.note}
                  onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  placeholder="เช่น โอนผ่าน Promptpay"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={submitPayment}
                disabled={saving}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold py-3 rounded-2xl transition-all disabled:opacity-60 cursor-pointer"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditForm(null)} />
          <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold text-slate-900">แก้ไขรายการหนี้</h2>
              <button onClick={() => setEditForm(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">ชื่อเจ้าหนี้ *</label>
                <input
                  type="text"
                  value={editForm.lender}
                  onChange={e => setEditForm({ ...editForm, lender: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">ยอดเงิน (บาท) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">฿</span>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    min="1"
                    className="w-full border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">วันที่ยืม *</label>
                <DatePicker
                  value={editForm.borrow_date}
                  onChange={date => setEditForm({ ...editForm, borrow_date: date })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  วันที่ต้องคืน <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
                </label>
                <DatePicker
                  value={editForm.due_date}
                  onChange={date => setEditForm({ ...editForm, due_date: date })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  หมายเหตุ <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={submitEdit}
                disabled={saving}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold py-3 rounded-2xl transition-all disabled:opacity-60 cursor-pointer"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs z-10 text-center">
            <p className="text-2xl mb-3">🗑️</p>
            <p className="font-bold text-slate-900 mb-1">ลบรายการนี้?</p>
            <p className="text-sm text-slate-400 mb-5">ไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => { await onDelete(deletingId); setDeletingId(null) }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-sm font-bold text-white hover:bg-rose-600 cursor-pointer"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
