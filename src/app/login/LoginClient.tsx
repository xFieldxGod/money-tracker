'use client'

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { authErrorMessage } from '@/lib/authErrors'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Cat, TriangleAlert, Copy, Check, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { isInAppBrowser } from '@/lib/browserDetect'

type View = 'main' | 'signup' | 'reset'

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const inputClass =
  'w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 font-medium placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all'

export default function LoginClient() {
  const [loading, setLoading] = useState(false)
  const [inApp] = useState(() => isInAppBrowser())
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [view, setView] = useState<View>('main')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()

  function switchView(next: View) {
    setView(next)
    setError(null)
    setInfo(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function run(task: () => Promise<void>) {
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      await task()
    } catch (e) {
      setError(authErrorMessage((e as { code?: string })?.code))
      setLoading(false)
    }
  }

  function signInWithGoogle() {
    run(async () => {
      await signInWithPopup(auth, googleProvider)
      router.push('/')
    })
  }

  function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    run(async () => {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/')
    })
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    run(async () => {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      // ส่งอีเมลยืนยันแบบ best-effort ไม่ต้องรอ/บล็อกการเข้าใช้งาน
      sendEmailVerification(cred.user).catch(() => {})
      router.push('/')
    })
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault()
    run(async () => {
      await sendPasswordResetEmail(auth, email)
      setInfo('ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย')
      setLoading(false)
    })
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const messages = (
    <>
      {error && (
        <p className="flex items-start justify-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50/80 border border-rose-100 rounded-2xl px-4 py-3 leading-relaxed">
          <TriangleAlert className="w-4 h-4 flex-shrink-0" /> <span>{error}</span>
        </p>
      )}
      {info && (
        <p className="flex items-start justify-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50/80 border border-emerald-100 rounded-2xl px-4 py-3 leading-relaxed">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> <span>{info}</span>
        </p>
      )}
    </>
  )

  const backLink = (
    <button
      type="button"
      onClick={() => switchView('main')}
      className="w-full text-center text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
    >
      <span className="inline-flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> กลับไปหน้าเข้าสู่ระบบ
      </span>
    </button>
  )

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 p-4">
      <div className="relative w-full max-w-sm bg-white border border-slate-100 shadow-premium-lg rounded-3xl p-8 sm:p-10 space-y-8">
        {/* App Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-200 to-indigo-400 items-center justify-center text-white shadow-premium ring-1 ring-black/5 mb-2">
            <Cat className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-indigo-600">
              Money Tracker
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium leading-relaxed">
              บันทึกรายรับรายจ่ายส่วนตัว<br />ฉบับน่ารักสไตล์แมวขาวโบว์ชมพู
            </p>
          </div>
        </div>

        {view === 'main' && (
          <div className="space-y-4">
            {inApp ? (
              <div className="bg-amber-50/80 backdrop-blur border border-amber-100 rounded-2xl p-4 space-y-2 text-left">
                <p className="font-semibold text-amber-800 text-xs flex items-center gap-1.5">
                  <TriangleAlert className="w-4 h-4 flex-shrink-0" /> ปุ่ม Google ใช้ไม่ได้ในเบราว์เซอร์ของแอปนี้
                </p>
                <p className="text-amber-700 text-xs leading-relaxed font-medium">
                  กรุณาเข้าสู่ระบบด้วยอีเมลแทน หรือ
                  <button onClick={copyLink} className="underline font-semibold cursor-pointer ml-1">
                    {copied ? (
                      <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> คัดลอกลิงก์แล้ว</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Copy className="w-3 h-3" /> คัดลอกลิงก์</span>
                    )}
                  </button>
                  ไปเปิดใน Chrome/Safari
                </p>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 bg-white border border-slate-200 rounded-2xl text-slate-700 hover:text-slate-900 hover:border-slate-300 font-semibold text-sm transition-all shadow-sm hover:shadow-premium hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>เข้าสู่ระบบด้วย Google</span>
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">หรือ</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="อีเมล"
                autoComplete="email"
                required
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                autoComplete="current-password"
                required
                className={inputClass}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-indigo-500 rounded-2xl text-white hover:bg-indigo-600 font-semibold text-sm transition-all shadow-sm hover:shadow-premium hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Spinner /> : <span>เข้าสู่ระบบ</span>}
              </button>
            </form>

            {messages}

            <div className="flex items-center justify-between text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchView('signup')}
                className="text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                สมัครสมาชิก
              </button>
              <button
                type="button"
                onClick={() => switchView('reset')}
                className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>
          </div>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <p className="text-center text-sm text-slate-600 font-semibold">สมัครสมาชิกด้วยอีเมล</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมล"
              autoComplete="email"
              required
              className={inputClass}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="ยืนยันรหัสผ่านอีกครั้ง"
              autoComplete="new-password"
              required
              className={inputClass}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-indigo-500 rounded-2xl text-white hover:bg-indigo-600 font-semibold text-sm transition-all shadow-sm hover:shadow-premium hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Spinner /> : <span>สมัครสมาชิก</span>}
            </button>
            {messages}
            {backLink}
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleReset} className="space-y-3">
            <p className="text-center text-sm text-slate-600 font-semibold">รีเซ็ตรหัสผ่าน</p>
            <p className="text-center text-xs text-slate-400 font-medium leading-relaxed">
              กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมล"
              autoComplete="email"
              required
              className={inputClass}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-indigo-500 rounded-2xl text-white hover:bg-indigo-600 font-semibold text-sm transition-all shadow-sm hover:shadow-premium hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Spinner /> : <span>ส่งลิงก์รีเซ็ตรหัสผ่าน</span>}
            </button>
            {messages}
            {backLink}
          </form>
        )}

        {view === 'main' && (
          <p className="text-center text-xs text-slate-400 font-medium leading-relaxed">
            ปลอดภัย เชื่อถือได้ · ข้อมูลของคุณถูกเก็บเป็นส่วนตัว
          </p>
        )}
      </div>
    </div>
  )
}
