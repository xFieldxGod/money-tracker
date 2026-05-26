'use client'

interface Props {
  message: string
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

  const icon = confirmLabel === 'ออกจากระบบ' ? '👋' : confirmColor === 'indigo' ? '📥' : '🗑️'

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[60] px-6">
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-premium-lg w-full max-w-xs p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl filter drop-shadow-sm mb-1">{icon}</div>
          <p className="font-extrabold text-slate-800 tracking-tight text-base">{confirmLabel}?</p>
          <p className="text-xs text-slate-400 font-medium leading-relaxed px-1">{message}</p>
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
