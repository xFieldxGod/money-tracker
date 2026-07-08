'use client'

import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import type { User } from 'firebase/auth'
import Link from 'next/link'
import { Cat, Home, HandCoins, LogOut } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

export default function Navbar({ user }: { user: User }) {
  const router = useRouter()
  const pathname = usePathname()
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSignOut() {
    await signOut(auth)
    router.push('/login')
  }

  return (
    <>
      <nav className="bg-white/75 backdrop-blur-xl border-b border-slate-200/40 sticky top-0 z-20 transition-all shadow-[0_2px_15px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-300 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Cat className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-display font-bold text-slate-900 leading-tight text-sm tracking-tight sm:text-base">Money Tracker</p>
              <p className="text-[10px] text-indigo-500 font-semibold leading-tight">บันทึกส่วนตัว</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${pathname === '/' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Home className="w-3.5 h-3.5" /> หน้าหลัก
            </Link>
            <Link
              href="/debts"
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${pathname === '/debts' ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <HandCoins className="w-3.5 h-3.5" /> หนี้สิน
            </Link>
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-100 hover:bg-rose-50/50 transition-all px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
            </button>
          </div>
        </div>
      </nav>

      {showConfirm && (
        <ConfirmDialog
          message={user.displayName ?? user.email ?? ''}
          onConfirm={handleSignOut}
          onCancel={() => setShowConfirm(false)}
          confirmLabel="ออกจากระบบ"
          confirmColor="red"
        />
      )}
    </>
  )
}
