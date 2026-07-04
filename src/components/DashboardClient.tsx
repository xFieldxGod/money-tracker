'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  query, where, orderBy, getDocs, Timestamp, writeBatch, deleteField,
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'
import type { Transaction, CustomCategory } from '@/types'
import type { ParsedExpense } from '@/lib/parseExpense'
import dynamic from 'next/dynamic'
import SummaryCards from './SummaryCards'
import TransactionForm from './TransactionForm'
import TransferForm from './TransferForm'
import WalletManager from './WalletManager'
import QuickAddBar from './QuickAddBar'
import { useWallets } from '@/lib/useWallets'
import { txMatchesWallet, resolveWalletId, walletName } from '@/lib/wallets'
import { groupTrashByMonth, isActiveTransaction, isTrashExpired, type TrashMonthGroup } from '@/lib/trash'
import TrashBin from './TrashBin'

const MonthlyChart = dynamic(() => import('./MonthlyChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl p-10 text-center text-gray-400 border border-gray-100">
      กำลังโหลดกราฟ...
    </div>
  ),
})
import TransactionList from './TransactionList'
import MonthPicker from './MonthPicker'
import ConfirmDialog from './ConfirmDialog'
import { useCustomCategories } from '@/lib/useCustomCategories'

interface Props {
  userId: string
}

function fmtMoney(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// รวมผลของ 1 รายการเข้า map ยอดต่อเป๋า (key = raw wallet_id, '' = รายการเก่าไม่มีเป๋า)
function applyTxToDeltas(deltas: Record<string, number>, tx: Transaction, sign: 1 | -1) {
  const src = tx.wallet_id ?? ''
  if (tx.type === 'income') {
    deltas[src] = (deltas[src] ?? 0) + sign * tx.amount
  } else if (tx.type === 'expense') {
    deltas[src] = (deltas[src] ?? 0) - sign * tx.amount
  } else {
    const dst = tx.to_wallet_id ?? ''
    deltas[src] = (deltas[src] ?? 0) - sign * tx.amount
    deltas[dst] = (deltas[dst] ?? 0) + sign * tx.amount
  }
}

export default function DashboardClient({ userId }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [prefillData, setPrefillData] = useState<Partial<Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'>> | null>(null)
  const [pendingNewCategory, setPendingNewCategory] = useState<CustomCategory | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [showDeleteMonthConfirm, setShowDeleteMonthConfirm] = useState(false)
  const [deletingMonth, setDeletingMonth] = useState(false)
  const [showTrashBin, setShowTrashBin] = useState(false)
  const [trashItems, setTrashItems] = useState<TrashMonthGroup[]>([])
  const [restoringMonth, setRestoringMonth] = useState<string | null>(null)
  const { customCategories, hiddenPresets, addCustomCategory, removeCustomCategory, hidePresetCategory, restorePresetCategory } = useCustomCategories(userId)
  const { wallets, addWallet, removeWallet } = useWallets(userId)
  const [selectedWalletId, setSelectedWalletId] = useState<'all' | string>('all')
  const [showWalletManager, setShowWalletManager] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null)
  const [rawDeltas, setRawDeltas] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'overview' | 'list'>('overview')
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null)
  const userInitial = (user?.displayName || user?.email || 'S').trim().charAt(0).toUpperCase()
  const showAvatar = Boolean(user?.photoURL && failedAvatarUrl !== user.photoURL)

  async function handleSignOut() {
    await signOut(auth)
    router.push('/login')
  }

  const activeWalletId: 'all' | string = selectedWalletId === 'all' || wallets.some(w => w.id === selectedWalletId)
    ? selectedWalletId
    : 'all'

  const walletTransactions = useMemo(
    () => transactions.filter(tx => txMatchesWallet(tx, activeWalletId, wallets)),
    [transactions, activeWalletId, wallets]
  )

  const totalIncome = useMemo(
    () => walletTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [walletTransactions]
  )
  const totalExpense = useMemo(
    () => walletTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [walletTransactions]
  )
  const walletBalances = useMemo(() => {
    const balances: Record<string, number> = Object.fromEntries(wallets.map(w => [w.id, 0]))
    for (const [rawId, amount] of Object.entries(rawDeltas)) {
      const resolved = resolveWalletId(rawId || undefined, wallets)
      balances[resolved] = (balances[resolved] ?? 0) + amount
    }
    return balances
  }, [rawDeltas, wallets])
  const allWalletBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + (walletBalances[wallet.id] ?? 0), 0),
    [walletBalances, wallets]
  )
  const displayBalance = activeWalletId === 'all'
    ? allWalletBalance
    : walletBalances[activeWalletId] ?? 0

  // รายชื่อหมวด (preset + custom) ส่งให้ AI เลือก
  const expenseCategoryNames = useMemo(
    () => [
      ...EXPENSE_CATEGORIES.filter(c => !hiddenPresets.some(h => h.type === 'expense' && h.name === c.name)).map(c => c.name),
      ...customCategories.filter(c => c.type === 'expense').map(c => `${c.icon} ${c.name}`),
    ],
    [customCategories, hiddenPresets]
  )
  const incomeCategoryNames = useMemo(
    () => [
      ...INCOME_CATEGORIES.filter(c => !hiddenPresets.some(h => h.type === 'income' && h.name === c.name)).map(c => c.name),
      ...customCategories.filter(c => c.type === 'income').map(c => `${c.icon} ${c.name}`),
    ],
    [customCategories, hiddenPresets]
  )

  function handleParsed(p: ParsedExpense) {
    if (p.isNew && p.category) {
      setPrefillData({ type: p.type, amount: p.amount, category: `${p.icon} ${p.category}`, note: p.note, date: p.date })
      setPendingNewCategory({ name: p.category, type: p.type, icon: p.icon })
    } else {
      setPrefillData({ type: p.type, amount: p.amount, category: p.category, note: p.note, date: p.date })
      setPendingNewCategory(null)
    }
    setShowForm(true)
  }

  function openBlankForm() {
    setPrefillData(null)
    setPendingNewCategory(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setPrefillData(null)
    setPendingNewCategory(null)
  }

  const loadTrashAndPurge = useCallback(async () => {
    const q = query(collection(db, 'transactions'), where('user_id', '==', userId))
    const snap = await getDocs(q)
    const trashed: Transaction[] = []
    const toPurge: string[] = []

    for (const d of snap.docs) {
      const tx = { id: d.id, ...d.data() } as Transaction
      if (!tx.deleted_at) continue
      if (isTrashExpired(tx.deleted_at)) toPurge.push(tx.id)
      else trashed.push(tx)
    }

    if (toPurge.length > 0) {
      for (let i = 0; i < toPurge.length; i += 500) {
        const batch = writeBatch(db)
        for (const id of toPurge.slice(i, i + 500)) {
          batch.delete(doc(db, 'transactions', id))
        }
        await batch.commit()
      }
    }

    setTrashItems(groupTrashByMonth(trashed))
  }, [userId])

  const loadTransactions = useCallback(async (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const q = query(
      collection(db, 'transactions'),
      where('user_id', '==', userId),
      where('date', '>=', firstDay.toISOString().split('T')[0]),
      where('date', '<=', lastDay.toISOString().split('T')[0]),
      orderBy('date', 'desc')
    )
    const snap = await getDocs(q)
    const sorted = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Transaction))
      .filter(isActiveTransaction)
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date)
        return b.created_at.localeCompare(a.created_at)
      })
    setTransactions(sorted)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTransactions(new Date())
  }, [loadTransactions])

  useEffect(() => {
    async function loadWalletBalances() {
      const q = query(
        collection(db, 'transactions'),
        where('user_id', '==', userId)
      )
      const snap = await getDocs(q)
      const deltas: Record<string, number> = {}
      for (const d of snap.docs) {
        const tx = { id: d.id, ...d.data() } as Transaction
        if (!isActiveTransaction(tx)) continue
        applyTxToDeltas(deltas, tx, 1)
      }
      setRawDeltas(deltas)
    }
    void loadWalletBalances()
    void loadTrashAndPurge()
  }, [userId, loadTrashAndPurge])

  async function handleMonthChange(date: Date) {
    setSelectedMonth(date)
    setLoading(true)
    await loadTransactions(date)
  }

  async function handleAdd(tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...tx,
      user_id: userId,
      created_at: Timestamp.now().toDate().toISOString(),
    })
    const newTx: Transaction = { id: docRef.id, user_id: userId, created_at: new Date().toISOString(), ...tx }
    const txDate = new Date(tx.date)
    if (txDate.getMonth() === selectedMonth.getMonth() && txDate.getFullYear() === selectedMonth.getFullYear()) {
      setTransactions(prev => [newTx, ...prev].sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.created_at.localeCompare(a.created_at)))
    }
    setRawDeltas(prev => {
      const next = { ...prev }
      applyTxToDeltas(next, newTx, 1)
      return next
    })
    // เก็บหมวดใหม่ที่ AI เสนอไว้ใช้ครั้งหน้า ถ้าผู้ใช้ยังเลือกไว้ และยังไม่มีในลิสต์
    if (
      pendingNewCategory &&
      tx.category === `${pendingNewCategory.icon} ${pendingNewCategory.name}` &&
      !customCategories.some(c => c.name === pendingNewCategory.name && c.type === pendingNewCategory.type)
    ) {
      await addCustomCategory(pendingNewCategory)
    }
    closeForm()
  }

  async function handleEdit(tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) {
    if (!editingTx) return
    await updateDoc(doc(db, 'transactions', editingTx.id), {
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      note: tx.note,
      date: tx.date,
      wallet_id: tx.wallet_id,
    })
    const updatedTx = { ...editingTx, ...tx }
    setTransactions(prev =>
      prev
        .map(t => t.id === editingTx.id ? updatedTx : t)
        .sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.created_at.localeCompare(a.created_at))
    )
    setRawDeltas(prev => {
      const next = { ...prev }
      applyTxToDeltas(next, editingTx, -1)
      applyTxToDeltas(next, updatedTx, 1)
      return next
    })
    setEditingTx(null)
  }

  async function handleDelete(id: string) {
    const tx = transactions.find(t => t.id === id)
    await deleteDoc(doc(db, 'transactions', id))
    setTransactions(prev => prev.filter(t => t.id !== id))
    if (tx) {
      setRawDeltas(prev => {
        const next = { ...prev }
        applyTxToDeltas(next, tx, -1)
        return next
      })
    }
  }

  async function handleDeleteMonth() {
    if (transactions.length === 0 || deletingMonth) return
    setDeletingMonth(true)
    try {
      const toDelete = transactions
      const deletedAt = new Date().toISOString()
      for (let i = 0; i < toDelete.length; i += 500) {
        const batch = writeBatch(db)
        for (const tx of toDelete.slice(i, i + 500)) {
          batch.update(doc(db, 'transactions', tx.id), { deleted_at: deletedAt })
        }
        await batch.commit()
      }
      setTransactions([])
      setRawDeltas(prev => {
        const next = { ...prev }
        for (const tx of toDelete) applyTxToDeltas(next, tx, -1)
        return next
      })
      setShowDeleteMonthConfirm(false)
      await loadTrashAndPurge()
    } finally {
      setDeletingMonth(false)
    }
  }

  async function handleRestoreMonth(monthKey: string) {
    if (restoringMonth) return
    setRestoringMonth(monthKey)
    try {
      const q = query(collection(db, 'transactions'), where('user_id', '==', userId))
      const snap = await getDocs(q)
      const toRestore = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Transaction))
        .filter(tx => tx.deleted_at && tx.date.startsWith(monthKey))

      for (let i = 0; i < toRestore.length; i += 500) {
        const batch = writeBatch(db)
        for (const tx of toRestore.slice(i, i + 500)) {
          batch.update(doc(db, 'transactions', tx.id), { deleted_at: deleteField() })
        }
        await batch.commit()
      }

      setRawDeltas(prev => {
        const next = { ...prev }
        for (const tx of toRestore) applyTxToDeltas(next, tx, 1)
        return next
      })

      if (format(selectedMonth, 'yyyy-MM') === monthKey) {
        setLoading(true)
        await loadTransactions(selectedMonth)
      }

      await loadTrashAndPurge()
    } finally {
      setRestoringMonth(null)
    }
  }

  async function handleAddTransfer(tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...tx,
      user_id: userId,
      created_at: Timestamp.now().toDate().toISOString(),
    })
    const newTx: Transaction = { id: docRef.id, user_id: userId, created_at: new Date().toISOString(), ...tx }
    const txDate = new Date(tx.date)
    if (txDate.getMonth() === selectedMonth.getMonth() && txDate.getFullYear() === selectedMonth.getFullYear()) {
      setTransactions(prev => [newTx, ...prev].sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.created_at.localeCompare(a.created_at)))
    }
    setRawDeltas(prev => {
      const next = { ...prev }
      applyTxToDeltas(next, newTx, 1)
      return next
    })
    setShowTransfer(false)
  }

  async function handleEditTransfer(tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) {
    if (!editingTransfer) return
    await updateDoc(doc(db, 'transactions', editingTransfer.id), {
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      note: tx.note,
      date: tx.date,
      wallet_id: tx.wallet_id,
      to_wallet_id: tx.to_wallet_id,
    })
    const updatedTx = { ...editingTransfer, ...tx }
    setTransactions(prev =>
      prev
        .map(t => t.id === editingTransfer.id ? updatedTx : t)
        .sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.created_at.localeCompare(a.created_at))
    )
    setRawDeltas(prev => {
      const next = { ...prev }
      applyTxToDeltas(next, editingTransfer, -1)
      applyTxToDeltas(next, updatedTx, 1)
      return next
    })
    setEditingTransfer(null)
  }

  function exportCSV() {
    const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: th })
    const header = 'วันที่,ประเภท,เป๋าตัง,หมวดหมู่,หมายเหตุ,จำนวน\n'
    const rows = walletTransactions
      .map(t => {
        const [y, m, d] = t.date.split('-')
        const dateFormatted = `${d}/${m}/${y}`
        const walletLabel = t.type === 'transfer'
          ? `${walletName(t.wallet_id, wallets).name} → ${walletName(t.to_wallet_id, wallets).name}`
          : walletName(t.wallet_id, wallets).name
        const category = t.category.replace(/,/g, ' ')
        const note = (t.note ?? '').replace(/,/g, ' ')
        const typeLabel = t.type === 'income' ? 'รายรับ' : t.type === 'expense' ? 'รายจ่าย' : 'โอน'
        return [dateFormatted, typeLabel, walletLabel.replace(/,/g, ' '), category, note, t.amount].join(',')
      })
      .join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `money-tracker-${monthLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Premium Welcome Header (Hello, Sarah 👋 Style) */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
            Hello, {user?.displayName ? user.displayName.split(' ')[0] : 'Sarah'} 👋
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Good Morning · สรุปบัญชีของคุณวันนี้
          </p>
        </div>
        <div className="flex items-center gap-3">
          
          {/* Profile Dropdown Container */}
          <div className="relative">
            {showAvatar ? (
              <img
                src={user?.photoURL ?? ''}
                alt="avatar"
                referrerPolicy="no-referrer"
                onError={() => setFailedAvatarUrl(user?.photoURL ?? null)}
                onClick={() => setShowProfileMenu(prev => !prev)}
                className="w-10 h-10 rounded-2xl ring-2 ring-indigo-50 shadow-sm object-cover cursor-pointer hover:ring-indigo-100 transition-all active:scale-95"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowProfileMenu(prev => !prev)}
                className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm cursor-pointer hover:bg-indigo-200 transition-all active:scale-95 ring-2 ring-indigo-50 shadow-sm"
                aria-label="Open profile menu"
              >
                {userInitial}
              </button>
            )}

            {/* Sleek Minimalist Profile Dropdown Popover (Facebook Style) */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 w-56 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-premium-lg p-4 z-50 animate-scale-up space-y-3">
                <div className="flex items-center gap-3 text-left">
                  {showAvatar ? (
                    <img
                      src={user?.photoURL ?? ''}
                      alt="avatar"
                      referrerPolicy="no-referrer"
                      onError={() => setFailedAvatarUrl(user?.photoURL ?? null)}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-1 ring-slate-100">
                      {userInitial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">
                      {user?.displayName || 'ผู้ใช้งาน'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold truncate leading-tight mt-1">
                      {user?.email || 'ไม่มีอีเมล'}
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-slate-100" />
                
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowSignOutConfirm(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50/50 transition-all cursor-pointer"
                >
                  <span className="text-sm">🚪</span>
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedWalletId('all')}
          className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
            activeWalletId === 'all'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white/80 text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          ทุกเป๋า ฿{fmtMoney(allWalletBalance)}
        </button>
        {wallets.map(wallet => (
          <button
            key={wallet.id}
            type="button"
            onClick={() => setSelectedWalletId(wallet.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
              activeWalletId === wallet.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white/80 text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {wallet.icon} {wallet.name} ฿{fmtMoney(walletBalances[wallet.id] ?? 0)}
          </button>
        ))}
        {wallets.length > 1 && (
          <button
            type="button"
            onClick={() => setShowTransfer(true)}
            className="flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-extrabold bg-white/80 text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer"
          >
            🔁 โอน
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowWalletManager(true)}
          className="flex-shrink-0 w-9 h-9 rounded-xl border bg-white/80 text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer"
          aria-label="จัดการเป๋าตัง"
        >
          ⚙️
        </button>
      </div>

      {/* Glassmorphic Summary Balance Card */}
      <SummaryCards
        income={totalIncome}
        expense={totalExpense}
        transactions={walletTransactions}
        userId={userId}
        selectedWalletId={activeWalletId}
        wallets={wallets}
      />

      {/* AI Quick-Add Bar */}
      <QuickAddBar
        expenseCategories={expenseCategoryNames}
        incomeCategories={incomeCategoryNames}
        onParsed={handleParsed}
      />

      {/* Month Selector & Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/45 p-3 rounded-[24px] shadow-premium min-w-0">
        <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
          <span className="hidden sm:inline text-xs font-bold text-slate-400 uppercase tracking-wider pl-1.5 shrink-0">เดือน:</span>
          <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowTrashBin(true)}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm transition-all cursor-pointer"
            title="ถังขยะ — กู้คืนรายการที่ลบ"
            aria-label="ถังขยะ"
          >
            🗑️
            {trashItems.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {trashItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowExportConfirm(true)}
            disabled={walletTransactions.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="ดาวน์โหลดข้อมูล CSV"
          >
            📥 <span className="sm:hidden">CSV</span><span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
          <button
            onClick={() => setShowDeleteMonthConfirm(true)}
            disabled={transactions.length === 0 || deletingMonth}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="ลบประวัติทั้งหมดของเดือนนี้"
          >
            🗑️ <span className="sm:hidden">ลบ</span><span className="hidden sm:inline">ลบเดือนนี้</span>
          </button>
        </div>
      </div>

      {/* Main Tab content */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/40 rounded-[24px] p-5 h-64 animate-pulse shadow-premium" />
            <div className="bg-white border border-slate-200/40 rounded-[24px] p-5 h-48 animate-pulse shadow-premium" />
          </div>
        ) : activeTab === 'overview' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Overview (กราฟวิเคราะห์)</h3>
            </div>
            <MonthlyChart transactions={walletTransactions} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity (ประวัติรายการล่าสุด)</h3>
            </div>
            <TransactionList
              transactions={walletTransactions}
              onDelete={handleDelete}
              onEdit={tx => tx.type === 'transfer' ? setEditingTransfer(tx) : setEditingTx(tx)}
              wallets={wallets}
              selectedWalletId={activeWalletId}
            />
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-full px-4 py-2 shadow-premium-lg flex justify-between items-center z-40 transition-all hover:bg-white">
        {/* Dashboard Tab */}
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'overview' ? 'text-indigo-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="text-[9px] uppercase tracking-wider">ภาพรวม</span>
        </button>

        {/* Center Floating Add Button */}
        <button
          onClick={openBlankForm}
          className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-100/50 hover:shadow-lg hover:shadow-emerald-200/50 active:scale-95 transition-all cursor-pointer transform -translate-y-4 animate-bounce-subtle"
          title="บันทึกรายการใหม่"
        >
          ➕
        </button>

        {/* Transactions Tab */}
        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'list' ? 'text-indigo-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <span className="text-lg">📋</span>
          <span className="text-[9px] uppercase tracking-wider">รายการ</span>
        </button>

        {/* Debts Tab */}
        <Link
          href="/debts"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all text-slate-400 hover:text-rose-500 font-semibold"
        >
          <span className="text-lg">💸</span>
          <span className="text-[9px] uppercase tracking-wider">หนี้สิน</span>
        </Link>
      </div>

      {showForm && (
        <TransactionForm
          onSubmit={handleAdd}
          onClose={closeForm}
          prefill={prefillData ?? undefined}
          customCategories={customCategories}
          onAddCustomCategory={addCustomCategory}
          onRemoveCustomCategory={removeCustomCategory}
          hiddenPresets={hiddenPresets}
          onHidePresetCategory={hidePresetCategory}
          onRestorePresetCategory={restorePresetCategory}
          wallets={wallets}
          defaultWalletId={activeWalletId === 'all' ? wallets[0]?.id : activeWalletId}
        />
      )}

      {editingTx && (
        <TransactionForm
          initialData={editingTx}
          onSubmit={handleEdit}
          onClose={() => setEditingTx(null)}
          customCategories={customCategories}
          onAddCustomCategory={addCustomCategory}
          onRemoveCustomCategory={removeCustomCategory}
          hiddenPresets={hiddenPresets}
          onHidePresetCategory={hidePresetCategory}
          onRestorePresetCategory={restorePresetCategory}
          wallets={wallets}
          defaultWalletId={activeWalletId === 'all' ? wallets[0]?.id : activeWalletId}
        />
      )}

      {showTransfer && (
        <TransferForm
          wallets={wallets}
          onSubmit={handleAddTransfer}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {editingTransfer && (
        <TransferForm
          wallets={wallets}
          initialData={editingTransfer}
          onSubmit={handleEditTransfer}
          onClose={() => setEditingTransfer(null)}
        />
      )}

      {showWalletManager && (
        <WalletManager
          wallets={wallets}
          balances={walletBalances}
          onAddWallet={addWallet}
          onRemoveWallet={async id => {
            await removeWallet(id)
            if (selectedWalletId === id) setSelectedWalletId('all')
          }}
          onClose={() => setShowWalletManager(false)}
        />
      )}

      {showExportConfirm && (
        <ConfirmDialog
          message="ดาวน์โหลดรายการเดือนนี้เป็นไฟล์ CSV?"
          onConfirm={() => { setShowExportConfirm(false); exportCSV() }}
          onCancel={() => setShowExportConfirm(false)}
          confirmLabel="ดาวน์โหลด"
          confirmColor="indigo"
        />
      )}

      {showDeleteMonthConfirm && (
        <ConfirmDialog
          message={`ย้ายรายการทั้งหมดใน ${format(selectedMonth, 'MMMM yyyy', { locale: th })} (${transactions.length} รายการ) ไปถังขยะ — กู้คืนได้ภายใน 5 วัน`}
          onConfirm={() => void handleDeleteMonth()}
          onCancel={() => !deletingMonth && setShowDeleteMonthConfirm(false)}
          confirmLabel={deletingMonth ? 'กำลังลบ...' : 'ลบเดือนนี้'}
        />
      )}

      {showTrashBin && (
        <TrashBin
          items={trashItems}
          onRestore={handleRestoreMonth}
          onClose={() => setShowTrashBin(false)}
          restoring={restoringMonth}
        />
      )}

      {showSignOutConfirm && (
        <ConfirmDialog
          message={user?.displayName || user?.email || ''}
          onConfirm={handleSignOut}
          onCancel={() => setShowSignOutConfirm(false)}
          confirmLabel="ออกจากระบบ"
          confirmColor="red"
        />
      )}
    </div>
  )
}
