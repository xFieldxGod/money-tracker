'use client'

import { useRef, useState } from 'react'
import { X, Loader2, Camera, Trash2, UserRound } from 'lucide-react'
import type { UserProfile } from '@/lib/useProfile'

interface Props {
  profile: UserProfile
  fallbackName: string
  fallbackPhoto: string | null
  onSave: (next: UserProfile) => Promise<void>
  onClose: () => void
}

// ย่อรูปเป็นสี่เหลี่ยมจัตุรัส (crop กลางภาพ) แล้วคืนเป็น JPEG data URL ขนาดเล็ก
// 256px q0.85 ได้ไฟล์ราว 10–30KB — เล็กพอสำหรับเก็บใน Firestore doc (จำกัด 1MB)
async function resizeImage(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function ProfileEditModal({ profile, fallbackName, fallbackPhoto, onSave, onClose }: Props) {
  const [name, setName] = useState(profile.name ?? fallbackName)
  const [photo, setPhoto] = useState<string | undefined>(profile.photo)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // รูปที่อัปโหลดเองมาก่อน ถ้าไม่มีใช้รูปจากบัญชี (Google) ถ้าไม่มีอีกแสดงตัวอักษรย่อ
  const previewPhoto = photo ?? fallbackPhoto

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ')
      return
    }
    setError(null)
    try {
      setPhoto(await resizeImage(file))
    } catch {
      setError('อ่านไฟล์รูปไม่สำเร็จ กรุณาลองรูปอื่น')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), photo })
      onClose()
    } catch {
      setError('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-[28px] w-full max-w-md shadow-premium-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
          <h2 className="font-extrabold text-slate-800 tracking-tight text-base flex items-center gap-1.5">
            <UserRound className="w-4.5 h-4.5 text-slate-500" />
            แก้ไขโปรไฟล์
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {previewPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewPhoto}
                  alt="avatar preview"
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-3xl object-cover ring-2 ring-indigo-50 shadow-premium"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-3xl ring-2 ring-indigo-50 shadow-premium">
                  {(name || fallbackName || 'S').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex items-center justify-center transition-all cursor-pointer"
                title="เปลี่ยนรูป"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(undefined)}
                className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> ลบรูปที่อัปโหลด
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 pl-1">ชื่อที่แสดง</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 bg-white"
              placeholder="ชื่อของคุณ"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50/80 border border-rose-100 rounded-2xl px-4 py-3 leading-relaxed">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 rounded-2xl text-white hover:bg-indigo-700 font-bold text-sm transition-all shadow-sm hover:shadow-premium disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>บันทึก</span>}
          </button>
        </form>
      </div>
    </div>
  )
}
