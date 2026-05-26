'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  query, where, getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Debt, DebtPayment } from '@/types'

function docToDebt(id: string, data: Record<string, unknown>): Debt {
  const createdAt = data.created_at as string
  return {
    id,
    user_id: data.user_id as string,
    lender: data.lender as string,
    amount: data.amount as number,
    paid: data.paid as number,
    borrow_date: (data.borrow_date as string | undefined) ?? createdAt.slice(0, 10),
    due_date: (data.due_date as string | null) ?? null,
    note: (data.note as string | null) ?? null,
    status: data.status as 'active' | 'paid',
    created_at: createdAt,
    payments: (data.payments as DebtPayment[]) ?? [],
  }
}

export function useDebts(userId: string) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDebts = useCallback(async () => {
    setLoading(true)
    const q = query(
      collection(db, 'debts'),
      where('user_id', '==', userId),
    )
    const snap = await getDocs(q)
    const sorted = snap.docs
      .map(d => docToDebt(d.id, d.data()))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    setDebts(sorted)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchDebts() }, [fetchDebts])

  async function addDebt(data: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'paid' | 'status' | 'payments'>) {
    const now = new Date().toISOString()
    const ref = await addDoc(collection(db, 'debts'), {
      ...data,
      user_id: userId,
      paid: 0,
      status: 'active',
      payments: [],
      created_at: now,
    })
    // บันทึกเป็นรายรับอัตโนมัติ ใช้วันที่ยืมจริง
    await addDoc(collection(db, 'transactions'), {
      user_id: userId,
      type: 'income',
      amount: data.amount,
      category: 'ยืมเงิน',
      note: `ยืมจาก ${data.lender}${data.note ? ` · ${data.note}` : ''}`,
      date: data.borrow_date,
      debt_id: ref.id,
      created_at: now,
    })
    const newDebt: Debt = {
      id: ref.id,
      user_id: userId,
      paid: 0,
      status: 'active',
      payments: [],
      created_at: now,
      ...data,
    }
    setDebts(prev => [newDebt, ...prev])
  }

  async function addPayment(debtId: string, amount: number, note: string | null, date: string) {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return
    const payment: DebtPayment = {
      id: `${Date.now()}`,
      amount,
      date,
      note,
    }
    const newPaid = debt.paid + amount
    const newStatus: 'active' | 'paid' = newPaid >= debt.amount ? 'paid' : 'active'
    const updatedPayments = [...debt.payments, payment]
    await updateDoc(doc(db, 'debts', debtId), {
      paid: newPaid,
      status: newStatus,
      payments: updatedPayments,
    })
    // บันทึกเป็นรายจ่ายอัตโนมัติ
    await addDoc(collection(db, 'transactions'), {
      user_id: userId,
      type: 'expense',
      amount,
      category: 'คืนหนี้',
      note: `คืนเงิน ${debt.lender}${note ? ` · ${note}` : ''}`,
      date,
      created_at: new Date().toISOString(),
    })
    setDebts(prev => prev.map(d =>
      d.id === debtId
        ? { ...d, paid: newPaid, status: newStatus, payments: updatedPayments }
        : d
    ))
  }

  async function markPaid(debtId: string) {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return
    const remaining = debt.amount - debt.paid
    await updateDoc(doc(db, 'debts', debtId), { status: 'paid', paid: debt.amount })
    // บันทึกยอดที่เหลือเป็นรายจ่ายอัตโนมัติ (ถ้ายังมียอดค้าง)
    if (remaining > 0) {
      await addDoc(collection(db, 'transactions'), {
        user_id: userId,
        type: 'expense',
        amount: remaining,
        category: 'คืนหนี้',
        note: `คืนเงินครบ ${debt.lender}`,
        date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      })
    }
    setDebts(prev => prev.map(d =>
      d.id === debtId ? { ...d, status: 'paid', paid: d.amount } : d
    ))
  }

  async function updateDebt(debtId: string, data: { lender: string; amount: number; borrow_date: string; due_date: string | null; note: string | null }) {
    const debt = debts.find(d => d.id === debtId)
    await updateDoc(doc(db, 'debts', debtId), data)

    // อัปเดต transaction ยืมเงินที่เกี่ยวข้อง
    let txSnap = await getDocs(query(
      collection(db, 'transactions'),
      where('user_id', '==', userId),
      where('debt_id', '==', debtId),
    ))
    // fallback สำหรับข้อมูลเก่าที่ไม่มี debt_id
    if (txSnap.empty && debt) {
      txSnap = await getDocs(query(
        collection(db, 'transactions'),
        where('user_id', '==', userId),
        where('category', '==', 'ยืมเงิน'),
        where('note', '==', `ยืมจาก ${debt.lender}${debt.note ? ` · ${debt.note}` : ''}`),
      ))
    }
    for (const txDoc of txSnap.docs) {
      await updateDoc(doc(db, 'transactions', txDoc.id), {
        date: data.borrow_date,
        amount: data.amount,
        note: `ยืมจาก ${data.lender}${data.note ? ` · ${data.note}` : ''}`,
        debt_id: debtId,
      })
    }

    setDebts(prev => prev.map(d => d.id === debtId ? { ...d, ...data } : d))
  }

  async function deleteDebt(debtId: string) {
    await deleteDoc(doc(db, 'debts', debtId))
    setDebts(prev => prev.filter(d => d.id !== debtId))
  }

  return { debts, loading, addDebt, addPayment, markPaid, updateDebt, deleteDebt, refetch: fetchDebts }
}
