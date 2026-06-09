import { suggestEmoji } from './emojiSuggest'
import type { TransactionType } from '@/types'

/** ผลลัพธ์ที่ AI (หรือ fallback) วิเคราะห์ได้จากข้อความเดียว เช่น "ตีแบด 205 บาท" */
export interface ParsedExpense {
  type: TransactionType
  amount: number
  /** ชื่อหมวด — ถ้า isNew จะเป็นรูปแบบ "<emoji> <ชื่อ>" */
  category: string
  /** true = AI เสนอหมวดใหม่ที่ยังไม่มีในลิสต์ */
  isNew: boolean
  /** emoji ของหมวด (ใช้ตอน prefill หมวดใหม่) */
  icon: string
  note: string | null
  /** YYYY-MM-DD */
  date: string
}

/** คำที่บ่งบอกว่าเป็นรายรับ (ใช้ใน fallback ฝั่ง client เมื่อ AI ใช้ไม่ได้) */
const INCOME_HINTS = /เงินเดือน|รายรับ|ได้เงิน|ได้รับ|โบนัส|เงินปันผล|ดอกเบี้ย|ขายของ|ขายได้|ค่าจ้าง|salary|bonus|income|received/i

/**
 * Fallback แบบ local เมื่อเรียก AI ไม่สำเร็จ:
 * ดึงจำนวนเงินด้วย regex, เดาประเภทจากคีย์เวิร์ด, ใส่ข้อความที่เหลือเป็น note
 * และปล่อย category ว่างไว้ให้ผู้ใช้เลือกเองในฟอร์ม
 */
export function localFallbackParse(text: string, today: string): ParsedExpense {
  const trimmed = text.trim()
  const type: TransactionType = INCOME_HINTS.test(trimmed) ? 'income' : 'expense'

  // จับตัวเลขก้อนแรก (รองรับ comma และทศนิยม) เช่น "1,250.50"
  const match = trimmed.match(/\d[\d,]*(?:\.\d+)?/)
  const amount = match ? parseFloat(match[0].replace(/,/g, '')) : 0

  // เอาตัวเลข + คำว่า "บาท/บ./thb" ออก เหลือไว้เป็น note
  const note = trimmed
    .replace(/\d[\d,]*(?:\.\d+)?/g, '')
    .replace(/บาท|บ\.|thb|฿/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    type,
    amount: Number.isFinite(amount) ? amount : 0,
    category: '',
    isNew: false,
    icon: suggestEmoji(note || trimmed, type),
    note: note || null,
    date: today,
  }
}
