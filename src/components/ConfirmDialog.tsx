'use client'

import { LogOut, Download, Trash2 } from 'lucide-react'

interface Props {
  message: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  confirmColor?: 'red' | 'indigo'
}

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'ลบ',
  confirmColor = 'red',
}: Props) {
  const confirmClass = confirmColor === 'indigo'
    ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
    : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700'

  const IconComponent = confirmLabel === 'ออกจากระบบ'
    ? LogOut
    : confirmColor === 'indigo'
      ? Download
      : Trash2

  const iconContainerClass = confirmLabel === 'ออกจากระบบ'
    ? 'bg-rose-50 border-rose-100/50 text-rose-500'
    : confirmColor === 'indigo'
      ? 'bg-indigo-50 border-indigo-100/50 text-indigo-500'
      : 'bg-rose-50 border-rose-100/50 text-rose-500'

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[60] px-6">
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-premium-lg w-full max-w-xs p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${iconContainerClass}`}>
              <IconComponent className="w-5 h-5" strokeWidth={2.2} />
            </div>
          </div>
          <p className="font-extrabold text-slate-800 tracking-tight text-base">{confirmLabel}?</p>
          <div className="text-xs text-slate-400 font-medium leading-relaxed px-1">{message}</div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-2xl text-white text-xs font-bold transition-all shadow-sm cursor-pointer ${confirmClass}`}
          >
            {confirmLabel === 'ลบ' ? 'ลบรายการ' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
