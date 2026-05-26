'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Navbar skeleton */}
      <nav className="bg-white/75 backdrop-blur-xl border-b border-slate-200/40 sticky top-0 z-20 shadow-[0_2px_15px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-28 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-2 w-16 bg-slate-100 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header skeleton */}
        <div className="flex items-center justify-between gap-2">
          <div className="h-9 w-40 bg-slate-200/80 rounded-2xl animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-slate-200/80 rounded-2xl animate-pulse" />
            <div className="h-9 w-20 bg-indigo-100 rounded-2xl animate-pulse" />
          </div>
        </div>
        {/* Hero balance skeleton */}
        <div className="bg-white border border-slate-200/40 rounded-[30px] p-6 h-48 animate-pulse shadow-premium" />
        {/* Chart skeleton with LCP title */}
        <div className="bg-white border border-slate-200/40 rounded-[24px] p-5 h-64 animate-pulse shadow-premium" />
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) return <DashboardSkeleton />
  if (!user) return null

  return (
    <div className="relative min-h-screen bg-slate-50/60 overflow-hidden">
      {/* Dynamic Aesthetic Background Orbs */}
      <div className="absolute top-[8%] left-[5%] w-80 h-80 rounded-full bg-indigo-300/15 blur-[100px] pointer-events-none animate-float-orb-1" />
      <div className="absolute bottom-[12%] right-[5%] w-96 h-96 rounded-full bg-purple-300/15 blur-[120px] pointer-events-none animate-float-orb-2" />

      <main className="relative max-w-4xl mx-auto px-4 py-6 z-10">{children}</main>
    </div>
  )
}
