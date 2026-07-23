'use client'

import { useState } from 'react'
import type { Wallet } from '@/types'
import ConfirmDialog from './ConfirmDialog'
import { Settings, X, Trash2, Loader2, Plus, SquarePen, Check } from 'lucide-react'

interface Props {
  wallets: Wallet[]
  balances: Record<string, number>
  onAddWallet: (name: string, icon: string) => Promise<void>
  onUpdateWallet: (id: string, name: string, icon: string) => Promise<void>
  onRemoveWallet: (id: string) => Promise<void>
  onClose: () => void
}

const WALLET_EMOJIS = ['👛', '🏦', '💵', '💳', '📱', '🪙', '🎯', '🧧', '🏠', '✈️', '🛒', '💼']

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function WalletManager({ wallets, balances, onAddWallet, onUpdateWallet, onRemoveWallet, onClose }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏦')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('👛')
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onAddWallet(name.trim(), icon)
    setName('')
    setIcon('🏦')
    setShowEmojiPicker(false)
    setLoading(false)
  }

  function startEdit(wallet: Wallet) {
    setEditingId(wallet.id)
    setEditName(wallet.name)
    setEditIcon(wallet.icon)
    setShowEditEmojiPicker(false)
  }

  async function saveEdit() {
    if (!editingId || !editName.trim() || savingEdit) return
    setSavingEdit(true)
    await onUpdateWallet(editingId, editName.trim(), editIcon)
    setSavingEdit(false)
    setEditingId(null)
  }

  async function confirmDelete() {
    if (!walletToDelete) return
    await onRemoveWallet(walletToDelete.id)
    setWalletToDelete(null)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-[28px] w-full max-w-md shadow-premium-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
          <h2 className="font-extrabold text-slate-800 tracking-tight text-base flex items-center gap-1.5">
            <Settings className="w-4.5 h-4.5 text-slate-500" />
            จัดการเป๋าตัง
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2.5">
            {wallets.map(wallet => (
              editingId === wallet.id ? (
                <div key={wallet.id} className="p-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowEditEmojiPicker(v => !v)}
                      className="w-11 h-11 text-xl rounded-xl border border-indigo-200 bg-white flex items-center justify-center hover:bg-indigo-50/80 shadow-sm transition-all cursor-pointer flex-shrink-0"
                    >
                      {editIcon}
                    </button>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void saveEdit() } }}
                      autoFocus
                      className="flex-1 min-w-0 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={savingEdit || !editName.trim()}
                      className="w-9 h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
                      title="บันทึก"
                    >
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
                      title="ยกเลิก"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {showEditEmojiPicker && (
                    <div className="bg-white rounded-xl border border-indigo-100 p-2.5 shadow-sm">
                      <div className="flex flex-wrap gap-1.5">
                        {WALLET_EMOJIS.map(e => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => { setEditIcon(e); setShowEditEmojiPicker(false) }}
                            className={`w-8 h-8 text-lg rounded-lg hover:bg-indigo-50 flex items-center justify-center transition-all cursor-pointer ${editIcon === e ? 'bg-indigo-100' : ''}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              <div
                key={wallet.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200/70 bg-slate-50/40"
              >
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-xl">
                  {wallet.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-800 truncate">{wallet.name}</p>
                  <p className={`text-xs font-bold tabular-nums ${(balances[wallet.id] ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ฿{fmt(Math.abs(balances[wallet.id] ?? 0))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(wallet)}
                  className="w-8 h-8 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50/70 transition-all flex items-center justify-center cursor-pointer"
                  title="แก้ไขเป๋า"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
                {wallets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setWalletToDelete(wallet)}
                    className="w-8 h-8 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50/70 transition-all flex items-center justify-center cursor-pointer"
                    title="ลบเป๋า"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              )
            ))}
          </div>

          <form onSubmit={handleAdd} className="p-4 rounded-2xl border border-indigo-100/70 bg-indigo-50/40 space-y-3.5">
            <p className="text-[10px] font-bold text-slate-400">เพิ่มเป๋าใหม่</p>
            <div className="flex gap-2.5 items-center">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(v => !v)}
                className="w-11 h-11 text-xl rounded-xl border border-indigo-200 bg-white flex items-center justify-center hover:bg-indigo-50/80 shadow-sm transition-all cursor-pointer flex-shrink-0"
              >
                {icon}
              </button>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="เช่น ธนาคาร, เงินสด"
                className="flex-1 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 bg-white placeholder:text-slate-300"
              />
            </div>

            {showEmojiPicker && (
              <div className="bg-white rounded-xl border border-indigo-100 p-2.5 shadow-sm">
                <div className="flex flex-wrap gap-1.5">
                  {WALLET_EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setIcon(e); setShowEmojiPicker(false) }}
                      className={`w-8 h-8 text-lg rounded-lg hover:bg-indigo-50 flex items-center justify-center transition-all cursor-pointer ${icon === e ? 'bg-indigo-100' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังเพิ่ม...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> เพิ่มเป๋า
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {walletToDelete && (
        <ConfirmDialog
          message={`${walletToDelete.icon} ${walletToDelete.name} รายการเดิมจะไปแสดงในเป๋าใบแรกโดยอัตโนมัติ`}
          confirmLabel="ลบเป๋า"
          confirmColor="red"
          onCancel={() => setWalletToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}
