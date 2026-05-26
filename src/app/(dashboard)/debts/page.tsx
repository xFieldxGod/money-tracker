'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useDebts } from '@/lib/useDebts'
import DebtForm from '@/components/DebtForm'
import DebtList from '@/components/DebtList'
import Link from 'next/link'

export default function DebtsPage() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const { debts, loading, addDebt, addPayment, markPaid, updateDebt, deleteDebt } = useDebts(user?.uid ?? '')

  if (!user) return null

  const totalDebt = debts.filter(d => d.status === 'active').reduce((s, d) => s + (d.amount - d.paid), 0)
  const totalPaid = debts.filter(d => d.status === 'paid').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-2xl bg-white border border-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight">หนี้สิน</h1>
            <p className="text-xs text-slate-400">ติดตามเงินที่ยืมมา</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-rose-100 transition-all cursor-pointer"
        >
          <span className="text-base leading-none">+</span>
          ยืมเงิน
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">ค้างจ่ายทั้งหมด</p>
          <p className="text-xl font-extrabold text-rose-600">฿{totalDebt.toLocaleString('th-TH')}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{debts.filter(d => d.status === 'active').length} รายการ</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">คืนแล้ว</p>
          <p className="text-xl font-extrabold text-emerald-600">{totalPaid} รายการ</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            ฿{debts.filter(d => d.status === 'paid').reduce((s, d) => s + d.amount, 0).toLocaleString('th-TH')}
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : (
        <DebtList
          debts={debts}
          onAddPayment={addPayment}
          onMarkPaid={markPaid}
          onDelete={deleteDebt}
          onEdit={updateDebt}
        />
      )}

      {/* Add form modal */}
      {showForm && (
        <DebtForm
          onSubmit={addDebt}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
