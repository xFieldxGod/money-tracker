import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { CustomCategory, HiddenPreset, TransactionType } from '@/types'

export function useCustomCategories(userId: string) {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [hiddenPresets, setHiddenPresets] = useState<HiddenPreset[]>([])

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'users', userId))
      if (snap.exists()) {
        setCustomCategories(snap.data().customCategories ?? [])
        setHiddenPresets(snap.data().hiddenPresets ?? [])
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

  async function hidePresetCategory(name: string, type: TransactionType) {
    if (hiddenPresets.some(h => h.name === name && h.type === type)) return
    const next = [...hiddenPresets, { name, type }]
    setHiddenPresets(next)
    await setDoc(doc(db, 'users', userId), { hiddenPresets: next }, { merge: true })
  }

  async function restorePresetCategory(name: string, type: TransactionType) {
    const next = hiddenPresets.filter(h => !(h.name === name && h.type === type))
    setHiddenPresets(next)
    await setDoc(doc(db, 'users', userId), { hiddenPresets: next }, { merge: true })
  }

  return {
    customCategories,
    hiddenPresets,
    addCustomCategory,
    removeCustomCategory,
    hidePresetCategory,
    restorePresetCategory,
  }
}
