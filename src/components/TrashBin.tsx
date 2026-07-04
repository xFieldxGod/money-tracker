'use client'

import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { TrashMonthGroup } from '@/lib/trash'
import { TRASH_RETENTION_DAYS } from '@/lib/trash'

interface Props {
  items: TrashMonthGroup[]
  onRestore: (monthKey: string) => Promise<void>
  onClose: () => void
  restoring: string | null
}

export default function TrashBin({ items, onRestore, onClose, restoring }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-[28px] w-full max-w-md shadow-premium-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
          <div>
            <h2 className="font-extrabold text-slate-800 tracking-tight text-base">🗑️ ถังขยะ</h2>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              กู้คืนได้ภายใน {TRASH_RETENTION_DAYS} วัน หลังจากนั้นจะลบถาวร
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-all cursor-pointer"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="text-4xl opacity-40">🗑️</div>
              <p className="text-sm font-bold text-slate-400">ถังขยะว่าง</p>
              <p className="text-xs text-slate-300">รายการที่ลบจะอยู่ที่นี่ชั่วคราว</p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.monthKey}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-800 truncate">
                    {format(item.month, 'MMMM yyyy', { locale: th })}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {item.count} รายการ · เหลือ {item.daysLeft} วัน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onRestore(item.monthKey)}
                  disabled={restoring === item.monthKey}
                  className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {restoring === item.monthKey ? 'กำลังกู้...' : '↩ กู้คืน'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
