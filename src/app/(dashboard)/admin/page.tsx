'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/lib/useAdmin'
import AdminClient from '@/components/AdminClient'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuth()
  const { isAdmin, loading } = useAdmin(user?.uid)

  if (!user) return null

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-9 w-56 bg-slate-200/80 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white border border-slate-200/40 rounded-[24px] animate-pulse shadow-premium" />
      </div>
    )
  }

  // ด่านนี้เป็นแค่ UX — ต่อให้ข้ามมาได้ firestore.rules ก็ไม่ยอมให้อ่านข้อมูลคนอื่นอยู่ดี
  if (!isAdmin) {
    return (
      <div className="pb-24">
        <div className="bg-white border border-slate-200/50 rounded-[24px] p-8 shadow-premium space-y-3 text-center">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
          <p className="text-xs font-semibold text-slate-500">
            บัญชีของคุณไม่มีสิทธิ์เข้าถึงข้อมูลรวมของระบบ
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  return <AdminClient />
}
