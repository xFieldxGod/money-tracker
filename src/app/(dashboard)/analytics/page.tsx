'use client'

import { useAuth } from '@/contexts/AuthContext'
import AnalyticsClient from '@/components/AnalyticsClient'

export default function AnalyticsPage() {
  const { user } = useAuth()
  if (!user) return null
  return <AnalyticsClient userId={user.uid} />
}
