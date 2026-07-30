import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * เช็คว่าผู้ใช้คนนี้เป็นแอดมินไหม โดยอ่าน field `role` ใน users/{uid}
 *
 * ตัวนี้ใช้แค่ซ่อน/แสดง UI เท่านั้น — ด่านจริงคือ firestore.rules ที่ตรวจ
 * role เดียวกันนี้ฝั่งเซิร์ฟเวอร์ ต่อให้ปลอม state ฝั่งหน้าเว็บก็อ่านข้อมูลไม่ได้
 *
 * ตั้งแอดมิน: เปิด Firebase Console → Firestore → users/{uid} → เพิ่ม role: "admin"
 */
export function useAdmin(userId: string | undefined) {
  // เก็บผลลัพธ์คู่กับ uid ที่ใช้ถาม เพื่อรู้ได้ตอน render ว่าผลนี้ตรงกับ userId ปัจจุบันไหม
  // (แทนการ setState ล้างค่าใน effect ตอน userId เปลี่ยน)
  const [result, setResult] = useState<{ uid: string; isAdmin: boolean } | null>(null)

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    getDoc(doc(db, 'users', userId))
      .then(snap => {
        if (!cancelled) setResult({ uid: userId, isAdmin: snap.exists() && snap.data().role === 'admin' })
      })
      .catch(() => {
        // อ่านไม่ได้ = ถือว่าไม่ใช่แอดมิน (rules จะกันอีกชั้นอยู่แล้ว)
        if (!cancelled) setResult({ uid: userId, isAdmin: false })
      })

    return () => { cancelled = true }
  }, [userId])

  if (!userId) return { isAdmin: false, loading: false }
  // ผลที่ค้างจาก uid ก่อนหน้ายังไม่นับ — ถือว่ายังโหลดอยู่
  if (result?.uid !== userId) return { isAdmin: false, loading: true }
  return { isAdmin: result.isAdmin, loading: false }
}
