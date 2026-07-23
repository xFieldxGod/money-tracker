import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { auth, db } from './firebase'

export interface UserProfile {
  name?: string
  // รูปโปรไฟล์แบบ base64 data URL (ย่อขนาดแล้ว) — เก็บใน Firestore แทน Storage เพื่อให้อยู่บน Spark plan ได้
  photo?: string
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfile>({})

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'users', userId))
      const saved: { name?: string | null; photo?: string | null } | undefined =
        snap.exists() ? snap.data().profile : undefined
      if (saved) setProfile({ name: saved.name ?? undefined, photo: saved.photo ?? undefined })
    }
    load()
  }, [userId])

  async function saveProfile(next: UserProfile) {
    setProfile(next)
    // เขียน null แทน undefined เพื่อให้ merge ล้างค่าเดิมได้จริง (merge ไม่ลบ field ที่หายไป)
    await setDoc(
      doc(db, 'users', userId),
      { profile: { name: next.name ?? null, photo: next.photo ?? null } },
      { merge: true }
    )
    // sync ชื่อเข้า Firebase Auth ด้วย ให้ที่อื่นที่อ่าน user.displayName ตรงกัน (best-effort)
    if (auth.currentUser && next.name && next.name !== auth.currentUser.displayName) {
      updateProfile(auth.currentUser, { displayName: next.name }).catch(() => {})
    }
  }

  return { profile, saveProfile }
}
