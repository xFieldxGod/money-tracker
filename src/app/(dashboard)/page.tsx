'use client'

import { useAuth } from '@/contexts/AuthContext'
import DashboardClient from '@/components/DashboardClient'

export default function HomePage() {
  const { user } = useAuth()
  if (!user) return null
  return <DashboardClient userId={user.uid} />
}
