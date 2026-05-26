import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { CustomCategory } from '@/types'

export function useCustomCategories(userId: string) {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'users', userId))
      if (snap.exists()) {
        setCustomCategories(snap.data().customCategories ?? [])
      }
    }
    load()
  }, [userId])

  async function addCustomCategory(cat: CustomCategory) {
    const next = [...customCategories, cat]
    setCustomCategories(next)
    await setDoc(doc(db, 'users', userId), { customCategories: next }, { merge: true })
  }

  async function removeCustomCategory(name: string) {
    const next = customCategories.filter(c => c.name !== name)
    setCustomCategories(next)
    await setDoc(doc(db, 'users', userId), { customCategories: next }, { merge: true })
  }

  return { customCategories, addCustomCategory, removeCustomCategory }
}
