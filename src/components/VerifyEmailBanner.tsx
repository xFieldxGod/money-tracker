'use client'

import { useAuth } from '@/contexts/AuthContext'
import { sendEmailVerification } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { MailWarning, X } from 'lucide-react'

export default function VerifyEmailBanner() {
  const { user } = useAuth()
  const [sent, setSent] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [reloaded, setReloaded] = useState(false)

  const isPasswordUser = user?.providerData.some((p) => p.providerId === 'password') ?? false
  const needsVerify = isPasswordUser && !!user && !user.emailVerified

  // emailVerified จะอัปเดตหลัง reload เท่านั้น — refresh ครั้งเดียวเผื่อผู้ใช้เพิ่งกดยืนยันมา
  useEffect(() => {
    if (needsVerify && !reloaded && user) {
      setReloaded(true)
      user.reload().catch(() => {})
    }
  }, [needsVerify, reloaded, user])

  if (!needsVerify || hidden) return null

  return (
    <div className="mb-4 bg-amber-50/80 backdrop-blur border border-amber-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-xs text-amber-800 font-medium leading-relaxed flex items-center gap-1.5">
        <MailWarning className="w-4 h-4 flex-shrink-0" />
        <span>ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายของคุณ</span>
      </p>
      <span className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => {
            if (user) sendEmailVerification(user).catch(() => {})
            setSent(true)
          }}
          disabled={sent}
          className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline disabled:no-underline disabled:opacity-60 cursor-pointer"
        >
          {sent ? 'ส่งแล้ว' : 'ส่งอีกครั้ง'}
        </button>
        <button
          onClick={() => setHidden(true)}
          aria-label="ปิด"
          className="text-amber-700 hover:text-amber-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </span>
    </div>
  )
}
