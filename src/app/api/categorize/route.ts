import { suggestEmoji } from '@/lib/emojiSuggest'
import type { ParsedExpense } from '@/lib/parseExpense'
import type { TransactionType } from '@/types'

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

interface CategorizeRequest {
  text: string
  today: string
  expenseCategories: string[]
  incomeCategories: string[]
}

// Schema บังคับให้ Gemini ตอบเป็น JSON ตามรูปแบบที่ต้องการ
const responseSchema = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING', enum: ['expense', 'income'] },
    amount: { type: 'NUMBER' },
    category: { type: 'STRING' },
    isNew: { type: 'BOOLEAN' },
    icon: { type: 'STRING' },
    note: { type: 'STRING' },
    date: { type: 'STRING' },
  },
  required: ['type', 'amount', 'category', 'isNew', 'icon', 'note', 'date'],
}

function buildPrompt(req: CategorizeRequest): string {
  return `คุณเป็นผู้ช่วยบันทึกรายรับรายจ่ายภาษาไทย แปลงข้อความสั้น ๆ ของผู้ใช้ให้เป็นรายการบัญชี

วันที่วันนี้: ${req.today}

หมวด "รายจ่าย" ที่มีอยู่: ${req.expenseCategories.join(', ')}
หมวด "รายรับ" ที่มีอยู่: ${req.incomeCategories.join(', ')}

ข้อความจากผู้ใช้: "${req.text}"

จงตอบเป็น JSON ตาม schema โดย:
- type: "expense" (รายจ่าย) หรือ "income" (รายรับ) — ค่าเริ่มต้นคือ expense
- amount: จำนวนเงินเป็นตัวเลข (บาท) ถ้าหาไม่เจอให้ใส่ 0
- category: ให้ใช้หมวดจากลิสต์ของ type นั้นก่อนเสมอ โดยคัดลอกชื่อให้ตรงเป๊ะทุกตัวอักษร (รวมอีโมจิ)
  ถ้ากิจกรรมมีความหมายใกล้เคียงหมวดเดิม ให้ถือว่าเป็นหมวดเดิม อย่าตั้งหมวดใหม่ที่ความหมายซ้ำกับที่มีอยู่
  ตั้งหมวดใหม่เฉพาะเมื่อไม่มีหมวดไหนเกี่ยวข้องเลยจริง ๆ — ชื่อสั้น ๆ ภาษาไทย ไม่ต้องมีอีโมจิ แล้วตั้ง isNew=true
- isNew: true ถ้า category เป็นหมวดใหม่ที่ไม่อยู่ในลิสต์, false ถ้าเลือกจากลิสต์
- icon: emoji 1 ตัวที่เหมาะกับหมวด
- note: คำอธิบายสั้น ๆ ของกิจกรรม/ร้าน (เช่น "ข้าวมันไก่") ถ้าไม่มีให้ใส่ ""
- date: วันที่ในรูปแบบ YYYY-MM-DD ค่าเริ่มต้นคือวันนี้ รองรับคำว่า "เมื่อวาน" "วันนี้"`
}

function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

// เทียบชื่อหมวดแบบไม่สนอีโมจินำหน้า — AI ชอบตอบชื่อหมวดเดิมแต่ไม่ติดอีโมจิมาด้วย
// (เช่น "เครื่องดื่ม" ทั้งที่ลิสต์มี "🥤 เครื่องดื่ม") ถ้าปล่อยผ่านจะกลายเป็นหมวดซ้ำ
const EMOJI_PREFIX_RE = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Component}]*/u
function stripEmojiPrefix(s: string): string {
  return s.trim().replace(EMOJI_PREFIX_RE, '').trim()
}

function matchExistingCategory(category: string, list: unknown): string | null {
  if (!Array.isArray(list)) return null
  const target = stripEmojiPrefix(category)
  for (const item of list) {
    if (typeof item !== 'string') continue
    if (item === category || stripEmojiPrefix(item) === target) return item
  }
  return null
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY' }, { status: 500 })
  }

  let body: CategorizeRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'รูปแบบ request ไม่ถูกต้อง' }, { status: 400 })
  }

  const text = body.text?.trim()
  if (!text) {
    return Response.json({ error: 'กรุณาพิมพ์ข้อความ' }, { status: 400 })
  }
  const today = isValidDate(body.today) ? body.today : new Date().toISOString().split('T')[0]

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt({ ...body, text, today }) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 }, // ปิด thinking ให้ตอบเร็วขึ้น (งานง่าย)
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Gemini API error', res.status, detail)
      return Response.json({ error: 'เรียก AI ไม่สำเร็จ', status: res.status, detail }, { status: 502 })
    }

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof raw !== 'string') {
      return Response.json({ error: 'AI ไม่ส่งผลลัพธ์' }, { status: 502 })
    }

    const out = JSON.parse(raw)

    // Validate + normalize ก่อนส่งกลับ
    const type: TransactionType = out.type === 'income' ? 'income' : 'expense'
    const amountNum = Number(out.amount)
    const amount = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : 0
    const rawCategory = typeof out.category === 'string' && out.category.trim() ? out.category.trim() : 'อื่นๆ'
    // ถ้าชื่อหมวดตรงกับหมวดเดิม (แม้ AI เขียนไม่เป๊ะ) ให้ใช้ชื่อจากลิสต์เสมอ
    // และตัดสิน isNew จากลิสต์จริง ไม่เชื่อค่าที่ AI ตอบ
    const matched = matchExistingCategory(
      rawCategory,
      type === 'income' ? body.incomeCategories : body.expenseCategories
    )
    const category = matched ?? rawCategory
    const isNew = matched === null
    const note = typeof out.note === 'string' && out.note.trim() ? out.note.trim() : null
    const icon = typeof out.icon === 'string' && out.icon.trim() ? out.icon.trim() : suggestEmoji(category, type)
    const date = isValidDate(out.date) ? out.date : today

    const result: ParsedExpense = { type, amount, category, isNew, icon, note, date }
    return Response.json(result)
  } catch (reason) {
    console.error('categorize failed', reason)
    return Response.json({ error: 'เกิดข้อผิดพลาดในการวิเคราะห์', detail: String(reason) }, { status: 502 })
  }
}
