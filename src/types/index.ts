export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType | 'transfer'
  amount: number
  category: string
  note: string | null
  date: string
  created_at: string
  /** เป๋าต้นทาง — ไม่มี = รายการเก่า ให้ถือเป็นของเป๋าใบแรก */
  wallet_id?: string
  /** เป๋าปลายทาง — มีเฉพาะ type 'transfer' */
  to_wallet_id?: string
  /** วันที่ย้ายไปถังขยะ — มีค่า = อยู่ในถังขยะ */
  deleted_at?: string
}

export interface Wallet {
  id: string
  name: string
  icon: string
}

export interface Category {
  name: string
  type: TransactionType
  icon: string
}

export interface CustomCategory {
  name: string
  type: TransactionType
  icon: string
}

/** หมวดมาตรฐานที่ผู้ใช้กดลบ (ซ่อนต่อผู้ใช้ กู้คืนได้) */
export interface HiddenPreset {
  name: string
  type: TransactionType
}

export const INCOME_CATEGORIES: Category[] = [
  { name: 'เงินเดือน', type: 'income', icon: '💼' },
  { name: 'ฟรีแลนซ์', type: 'income', icon: '💻' },
  { name: 'ลงทุน', type: 'income', icon: '📈' },
  { name: 'ของขวัญ', type: 'income', icon: '🎁' },
  { name: 'อื่นๆ', type: 'income', icon: '💰' },
]

export interface DebtPayment {
  id: string
  amount: number
  date: string
  note: string | null
}

export interface Debt {
  id: string
  user_id: string
  lender: string
  amount: number
  paid: number
  borrow_date: string
  due_date: string | null
  note: string | null
  status: 'active' | 'paid'
  created_at: string
  payments: DebtPayment[]
}

export const EXPENSE_CATEGORIES: Category[] = [
  { name: 'อาหาร', type: 'expense', icon: '🍜' },
  { name: 'เดินทาง', type: 'expense', icon: '🚗' },
  { name: 'ที่พัก', type: 'expense', icon: '🏠' },
  { name: 'ช้อปปิ้ง', type: 'expense', icon: '🛍️' },
  { name: 'สุขภาพ', type: 'expense', icon: '💊' },
  { name: 'บันเทิง', type: 'expense', icon: '🎬' },
  { name: 'ค่าสาธารณูปโภค', type: 'expense', icon: '💡' },
  { name: 'การศึกษา', type: 'expense', icon: '📚' },
  { name: 'อื่นๆ', type: 'expense', icon: '💸' },
]
