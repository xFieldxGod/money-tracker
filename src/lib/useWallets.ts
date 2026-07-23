import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { DEFAULT_WALLET } from './wallets'
import type { Wallet } from '@/types'

export function useWallets(userId: string) {
  const [wallets, setWallets] = useState<Wallet[]>([DEFAULT_WALLET])
  const [walletsLoaded, setWalletsLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'users', userId))
      const saved: Wallet[] | undefined = snap.exists() ? snap.data().wallets : undefined
      if (saved && saved.length > 0) {
        setWallets(saved)
      } else {
        // ผู้ใช้เดิมยังไม่มีเป๋า — seed เป๋าเริ่มต้นครั้งเดียว
        setWallets([DEFAULT_WALLET])
        await setDoc(doc(db, 'users', userId), { wallets: [DEFAULT_WALLET] }, { merge: true })
      }
      setWalletsLoaded(true)
    }
    load()
  }, [userId])

  async function addWallet(name: string, icon: string) {
    const next = [...wallets, { id: crypto.randomUUID(), name, icon }]
    setWallets(next)
    await setDoc(doc(db, 'users', userId), { wallets: next }, { merge: true })
  }

  async function updateWallet(id: string, name: string, icon: string) {
    const next = wallets.map(w => (w.id === id ? { ...w, name, icon } : w))
    setWallets(next)
    await setDoc(doc(db, 'users', userId), { wallets: next }, { merge: true })
  }

  async function removeWallet(id: string) {
    if (wallets.length <= 1) return
    const next = wallets.filter(w => w.id !== id)
    setWallets(next)
    await setDoc(doc(db, 'users', userId), { wallets: next }, { merge: true })
  }

  return { wallets, walletsLoaded, addWallet, updateWallet, removeWallet }
}
