'use client'

import { useState } from 'react'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types'
import { suggestEmoji } from '@/lib/emojiSuggest'
import { resolveWalletId } from '@/lib/wallets'
import type { Transaction, TransactionType, CustomCategory, HiddenPreset, Wallet } from '@/types'
import DatePicker from './DatePicker'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  onSubmit: (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onClose: () => void
  initialData?: Transaction
  /** ค่าตั้งต้นจาก AI Quick-Add (ใช้ตอนเพิ่มรายการ ไม่ทำให้เข้าโหมดแก้ไข) */
  prefill?: Partial<Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'>>
  customCategories?: CustomCategory[]
  onAddCustomCategory?: (cat: CustomCategory) => Promise<void>
  onRemoveCustomCategory?: (name: string) => Promise<void>
  hiddenPresets?: HiddenPreset[]
  onHidePresetCategory?: (name: string, type: TransactionType) => Promise<void>
  onRestorePresetCategory?: (name: string, type: TransactionType) => Promise<void>
  wallets?: Wallet[]
  defaultWalletId?: string
}

const COMMON_EMOJIS = ['🍜','☕','🛵','🚗','⛽','🏠','💊','🎬','🛍️','📱','💡','📚','🎮','✈️','🍺','🎁','💻','📈','💼','🛒','💳','🐾','🏋️','🎵','🍕','🧋','📦','🏖️']

export default function TransactionForm({ onSubmit, onClose, initialData, prefill, customCategories = [], onAddCustomCategory, onRemoveCustomCategory, hiddenPresets = [], onHidePresetCategory, onRestorePresetCategory, wallets = [], defaultWalletId }: Props) {
  const initialType: TransactionType = initialData?.type === 'income'
    ? 'income'
    : initialData?.type === 'expense'
      ? 'expense'
      : prefill?.type === 'income' ? 'income' : 'expense'
  const [type, setType] = useState<TransactionType>(initialType)
  const [amount, setAmount] = useState(
    (initialData?.amount ?? prefill?.amount)?.toString() ?? ''
  )
  const [category, setCategory] = useState(initialData?.category ?? prefill?.category ?? '')
  const [note, setNote] = useState(initialData?.note ?? prefill?.note ?? '')
  const [date, setDate] = useState(initialData?.date ?? prefill?.date ?? new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [managingCategories, setManagingCategories] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; icon: string; isPreset: boolean } | null>(null)
  const [walletId, setWalletId] = useState(() => resolveWalletId(initialData?.wallet_id ?? defaultWalletId, wallets))

  const presetCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const visiblePresets = presetCategories.filter(c => !hiddenPresets.some(h => h.name === c.name && h.type === type))
  const hiddenForType = presetCategories.filter(c => hiddenPresets.some(h => h.name === c.name && h.type === type))
  const savedCustomCategories = customCategories.filter(c => c.type === type)
  const isEditMode = !!initialData

  function selectPreset(name: string) {
    setCategory(name)
    setIsCustom(false)
    setCustomName('')
  }

  function handleCustomNameChange(value: string) {
    setCustomName(value)
    if (value.trim()) setCustomEmoji(suggestEmoji(value, type))
  }

  async function handleCustomConfirm() {
    if (!customName.trim()) return
    const newCat: CustomCategory = { name: customName.trim(), type, icon: customEmoji || '💳' }
    const finalCategory = `${newCat.icon} ${newCat.name}`
    setCategory(finalCategory)
    setIsCustom(false)
    setCustomName('')
    // บันทึกลง Firestore เพื่อใช้ครั้งหน้า
    if (onAddCustomCategory) await onAddCustomCategory(newCat)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !category) return
    setLoading(true)
    await onSubmit({ type, amount: parseFloat(amount), category, note: note || null, date, wallet_id: walletId })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-[28px] w-full max-w-md shadow-premium-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
          <h2 className="font-extrabold text-slate-800 tracking-tight text-base">
            {isEditMode ? '📝 แก้ไขรายการบันทึก' : '➕ บันทึกรายการใหม่'}
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
          {/* Type Toggle */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">ประเภทรายการ</label>
            <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-[18px]">
              {(['expense', 'income'] as const).map(t => (
                <button 
                  key={t} 
                  type="button"
                  onClick={() => { setType(t); setCategory(''); setIsCustom(false); setCustomName('') }}
                  className={`flex-1 py-2.5 rounded-[13px] text-xs font-extrabold transition-all cursor-pointer ${
                    type === t
                      ? t === 'expense' 
                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-100' 
                        : 'bg-emerald-500 text-white shadow-sm shadow-emerald-100'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'expense' ? '💸 รายจ่าย (Expense)' : '💵 รายรับ (Income)'}
                </button>
              ))}
            </div>
          </div>

          {wallets.length > 1 && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">เป๋าตัง</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {wallets.map(wallet => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => setWalletId(wallet.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      walletId === wallet.id
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {wallet.icon} {wallet.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">จำนวนเงิน (THB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-lg">฿</span>
              <input
                type="number" min="0" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00" required
                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl pl-9 pr-4 py-3.5 text-lg font-extrabold text-slate-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เลือกหมวดหมู่</label>
              {(onRemoveCustomCategory || onHidePresetCategory) && (
                <button
                  type="button"
                  onClick={() => setManagingCategories(v => !v)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    managingCategories
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {managingCategories ? '✓ เสร็จสิ้น' : '🖊️ แก้ไขหมวดหมู่'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Preset */}
              {visiblePresets.map(c => (
                <div key={c.name} className="relative">
                  <button
                    type="button"
                    onClick={() => selectPreset(c.name)}
                    className={`w-full py-2.5 px-3 rounded-2xl text-xs border transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                      category === c.name
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 shadow-sm'
                        : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50/40 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm">{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                  {onHidePresetCategory && managingCategories && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setCategoryToDelete({ name: c.name, icon: c.icon, isPreset: true }) }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* Saved custom categories */}
              {savedCustomCategories.map(c => {
                const fullName = `${c.icon} ${c.name}`
                return (
                  <div key={c.name} className="relative group">
                    <button
                      type="button"
                      onClick={() => selectPreset(fullName)}
                      className={`w-full py-2.5 px-3 rounded-2xl text-xs border transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                        category === fullName
                          ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50/40 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm">{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                    {onRemoveCustomCategory && managingCategories && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setCategoryToDelete({ name: c.name, icon: c.icon, isPreset: false }) }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center cursor-pointer shadow-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Add new custom */}
              <button 
                type="button"
                onClick={() => { setIsCustom(true); setCategory('') }}
                className={`py-2.5 px-3 rounded-2xl text-xs border transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                  isCustom
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 shadow-sm'
                    : 'border-dashed border-slate-300 text-slate-400 bg-slate-50/20 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <span>➕</span>
                <span className="truncate">เพิ่มใหม่</span>
              </button>
            </div>

            {/* Hidden presets: restore chips (โหมดแก้ไขเท่านั้น) */}
            {managingCategories && onRestorePresetCategory && hiddenForType.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50/70 border border-slate-200/60 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">หมวดที่ลบไป (กดเพื่อกู้คืน)</p>
                <div className="flex flex-wrap gap-1.5">
                  {hiddenForType.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => void onRestorePresetCategory(c.name, type)}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all cursor-pointer"
                    >
                      ↩ {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom input */}
            {isCustom && (
              <div className="mt-3.5 p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl space-y-3.5 shadow-inner">
                <div className="flex gap-2.5 items-center">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className="w-11 h-11 text-xl rounded-xl border border-indigo-200 bg-white flex items-center justify-center hover:bg-indigo-50/80 shadow-sm transition-all cursor-pointer flex-shrink-0"
                  >
                    {customEmoji || '❓'}
                  </button>
                  <input
                    type="text" 
                    value={customName}
                    onChange={e => handleCustomNameChange(e.target.value)}
                    placeholder="ระบุชื่อ เช่น กาแฟ, ขนม"
                    className="flex-1 border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 bg-white placeholder:text-slate-300"
                    autoFocus
                  />
                </div>

                {showEmojiPicker && (
                  <div className="bg-white rounded-xl border border-indigo-100 p-2.5 shadow-sm max-h-[160px] overflow-y-auto">
                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">เลือกไอคอน Emoji</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_EMOJIS.map(e => (
                        <button 
                          key={e} 
                          type="button"
                          onClick={() => { setCustomEmoji(e); setShowEmojiPicker(false) }}
                          className={`w-8 h-8 text-lg rounded-lg hover:bg-indigo-50 flex items-center justify-center transition-all cursor-pointer ${customEmoji === e ? 'bg-indigo-100' : ''}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {customName.trim() && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      ตัวอย่างหมวดหมู่: <span className="font-extrabold text-indigo-600">{customEmoji} {customName}</span>
                    </span>
                    <button 
                      type="button" 
                      onClick={handleCustomConfirm}
                      className="text-xs text-indigo-600 font-extrabold hover:text-indigo-800 bg-white border border-indigo-200/60 px-3 py-1 rounded-xl shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                    >
                      บันทึกไว้ใช้ ✓
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selected custom */}
            {category && !presetCategories.find(c => c.name === category) && !savedCustomCategories.find(c => `${c.icon} ${c.name}` === category) && !isCustom && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/70 border border-indigo-100/50 px-3 py-2 rounded-xl">
                <span className="font-semibold">✓ เลือกหมวดหมู่:</span>
                <span className="font-extrabold">{category}</span>
                <button 
                  type="button" 
                  onClick={() => setCategory('')} 
                  className="ml-auto text-slate-400 hover:text-rose-500 w-5 h-5 rounded-full hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">วันที่ทำรายการ</label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          {/* Note */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">หมายเหตุ (คำอธิบายเพิ่มเติม)</label>
            <input 
              type="text" 
              value={note} 
              onChange={e => setNote(e.target.value)}
              placeholder="ระบุ เช่น สตาร์บัคส์, เติมน้ำมันปั๊ม ปตท."
              className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !amount || !category}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 active:scale-[0.99] cursor-pointer mt-2"
          >
            {loading ? '⏳ กำลังบันทึกข้อมูล...' : isEditMode ? '✓ บันทึกการแก้ไข' : '✓ ยืนยันบันทึกรายการ'}
          </button>
        </form>
      </div>

      {categoryToDelete && (
        <ConfirmDialog
          message={
            categoryToDelete.isPreset
              ? `${categoryToDelete.icon} ${categoryToDelete.name} (หมวดมาตรฐาน — กู้คืนได้ภายหลัง)`
              : `${categoryToDelete.icon} ${categoryToDelete.name}`
          }
          confirmLabel="ลบหมวดหมู่"
          confirmColor="red"
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={() => {
            if (categoryToDelete.isPreset) {
              if (onHidePresetCategory) void onHidePresetCategory(categoryToDelete.name, type)
              if (category === categoryToDelete.name) setCategory('')
            } else {
              if (onRemoveCustomCategory) void onRemoveCustomCategory(categoryToDelete.name)
              if (category === `${categoryToDelete.icon} ${categoryToDelete.name}`) setCategory('')
            }
            setCategoryToDelete(null)
          }}
        />
      )}
    </div>
  )
}
