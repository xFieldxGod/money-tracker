'use client'

import dynamic from 'next/dynamic'

const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-gray-400">กำลังโหลด...</div>
    </div>
  ),
})

export default function LoginPage() {
  return <LoginClient />
}
