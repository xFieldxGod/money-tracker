'use client'

import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { isInAppBrowser } from '@/lib/browserDetect'

export default function LoginClient() {
  const [loading, setLoading] = useState(false)
  const [inApp] = useState(() => isInAppBrowser())
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  async function signInWithGoogle() {
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      router.push('/')
    } catch {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 p-4">
      {/* Dynamic Aesthetic Background Orbs */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-indigo-300/30 blur-[80px] pointer-events-none animate-float-orb-1" />
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 rounded-full bg-purple-300/25 blur-[90px] pointer-events-none animate-float-orb-2" />

      {/* Floating Glassmorphic Login Card */}
      <div className="relative w-full max-w-sm bg-white/70 backdrop-blur-xl border border-white/60 shadow-premium-lg rounded-3xl p-8 sm:p-10 space-y-8 transition-premium">
        {/* App Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 text-4xl shadow-sm mb-2">
            💰
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Money Tracker
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium leading-relaxed">
              บันทึกรายรับรายจ่ายส่วนตัว<br />อย่างง่ายและงดงาม
            </p>
          </div>
        </div>

        {inApp ? (
          /* Premium In-app browser warning */
          <div className="space-y-5">
            <div className="bg-amber-50/80 backdrop-blur border border-amber-100 rounded-2xl p-4 space-y-2 text-left">
              <p className="font-semibold text-amber-800 text-sm flex items-center gap-1.5">
                <span>⚠️</span> ไม่สามารถเข้าสู่ระบบได้
              </p>
              <p className="text-amber-700 text-xs leading-relaxed font-medium">
                Google ไม่อนุญาตให้ล็อกอินผ่านเบราว์เซอร์ภายในของแอป (LINE, Messenger, Social Media) 
                กรุณาเปิดลิงก์ด้วยเบราว์เซอร์หลักของเครื่องแทน
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-semibold text-center uppercase tracking-wider">
                วิธีเปิดใน Chrome หรือ Safari:
              </p>
              <ol className="text-xs text-slate-600 text-left space-y-2 bg-slate-100/50 backdrop-blur border border-slate-200/50 rounded-2xl p-4 font-medium">
                <li className="flex gap-2">
                  <span className="text-indigo-500">1.</span>
                  <span>แตะปุ่มเมนูด้านมุมขวาบน <strong>⋯</strong> หรือ <strong>⋮</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">2.</span>
                  <span>เลือก <strong>&quot;เปิดด้วยเบราว์เซอร์ภายนอก&quot;</strong> หรือ <strong>&quot;เปิดใน Chrome/Safari&quot;</strong></span>
                </li>
              </ol>
            </div>

            <button
              onClick={copyLink}
              className="w-full py-3 px-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-all font-semibold shadow-sm hover:shadow-premium cursor-pointer"
            >
              {copied ? '✓ คัดลอกลิงก์สำเร็จ' : '📋 คัดลอกลิงก์เพื่อเปิดเอง'}
            </button>
          </div>
        ) : (
          /* Premium Google Login Button */
          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 bg-white border border-slate-200 rounded-2xl text-slate-700 hover:text-slate-900 hover:border-slate-300 font-semibold text-sm transition-all shadow-sm hover:shadow-premium hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center w-full">
                  <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>กำลังเชื่อมต่อบัญชี...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>เข้าสู่ระบบด้วย Google</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 font-medium leading-relaxed">
              ปลอดภัย เชื่อถือได้ · ล็อกอินผ่านระบบทางการของ Google
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
