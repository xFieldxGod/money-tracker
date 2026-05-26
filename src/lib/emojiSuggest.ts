const rules: [RegExp, string][] = [
  // Delivery / Food service
  [/ไลน์แมน|lineman|line\s*man/i, '🛵'],
  [/grab\s*food|grabfood/i, '🟢'],
  [/foodpanda|food\s*panda/i, '🐼'],
  [/โรบิ้นฮู้ด|robinhood/i, '🏹'],
  [/เดลิเวอรี่|delivery|ส่งอาหาร/i, '🛵'],

  // Food & Drink
  [/กาแฟ|coffee|ลาเต้|คาปูชิโน่/i, '☕'],
  [/ชาไทย|ชานม|บอบา|ชา(?!ติ)/i, '🧋'],
  [/เบียร์|beer/i, '🍺'],
  [/เหล้า|สุรา|ไวน์|wine|cocktail|คอกเทล/i, '🥂'],
  [/น้ำ(?!มัน|ค่า)|น้ำดื่ม|น้ำเปล่า/i, '💧'],
  [/เครื่องดื่ม|drink|juice|น้ำผลไม้|smoothie/i, '🥤'],
  [/ขนม|เค้ก|cake|dessert|ของหวาน|คุกกี้|ไอศกรีม/i, '🍰'],
  [/ข้าว|อาหาร|กับข้าว|ร้านอาหาร|restaurant|ก๋วยเตี๋ยว|ส้มตำ/i, '🍜'],
  [/ไก่|หมู|เนื้อ|ปลา|ทะเล|bbq|บาร์บีคิว/i, '🍖'],
  [/พิซซ่า|pizza/i, '🍕'],
  [/ซูชิ|sushi|ญี่ปุ่น/i, '🍣'],
  [/แมคโดนัลด์|kfc|burger|เบอร์เกอร์|fast\s*food/i, '🍔'],

  // Transport
  [/น้ำมัน|xăng|ค่าน้ำมัน/i, '⛽'],
  [/uber|bolt|แท็กซี่|taxi|รถรับจ้าง/i, '🚕'],
  [/grab(?!\s*food)/i, '🚗'],
  [/รถไฟฟ้า|bts|mrt|สกายเทรน/i, '🚇'],
  [/รถ(?!ไฟ)|ยานพาหนะ|car|จอดรถ|ค่าจอด/i, '🚗'],
  [/เดินทาง|ตั๋ว|ticket|ทริป|trip/i, '✈️'],
  [/วินมอเตอร์|มอเตอร์ไซค์|จักรยานยนต์/i, '🏍️'],
  [/เรือ|เรือด่วน/i, '⛵'],

  // Housing & Utilities
  [/ค่าเช่า|เช่าบ้าน|rent/i, '🏠'],
  [/ค่าไฟ|ไฟฟ้า|electricity/i, '⚡'],
  [/ค่าน้ำ(?!มัน)|ประปา|water\s*bill/i, '🚿'],
  [/อินเตอร์เน็ต|เน็ต|wifi|internet/i, '📶'],
  [/โทรศัพท์|มือถือ|phone|ค่าโทร/i, '📱'],
  [/แก๊ส|gas/i, '🔥'],
  [/ค่าส่วนกลาง|maintenance/i, '🏢'],

  // Health
  [/ยา|หมอ|โรงพยาบาล|คลินิก|hospital|doctor|medical/i, '💊'],
  [/นวด|สปา|spa|massage/i, '💆'],
  [/ยิม|gym|ออกกำลังกาย|ฟิตเนส|fitness/i, '🏋️'],
  [/ประกัน|insurance/i, '🛡️'],

  // Entertainment
  [/หนัง|ภาพยนตร์|cinema|โรงหนัง/i, '🎬'],
  [/เพลง|concert|ดนตรี|spotify|music/i, '🎵'],
  [/เกม|game|steam|playstation|xbox/i, '🎮'],
  [/netflix|youtube\s*premium|disney|hbo|streaming/i, '📺'],
  [/ท่องเที่ยว|เที่ยว|hotel|โรงแรม|resort/i, '🏖️'],
  [/คาราโอเกะ|karaoke/i, '🎤'],

  // Shopping & Fashion
  [/เสื้อผ้า|เสื้อ|กางเกง|เดรส|fashion/i, '👕'],
  [/รองเท้า|shoes/i, '👟'],
  [/กระเป๋า|bag/i, '👜'],
  [/เครื่องสำอาง|makeup|skincare|ครีม/i, '💄'],
  [/ของเล่น|toy/i, '🧸'],
  [/shopee|lazada|amazon|ช้อปปิ้งออนไลน์/i, '📦'],

  // Education
  [/หนังสือ|book|ตำรา/i, '📚'],
  [/คอร์ส|course|เรียน|tutor|กวดวิชา/i, '🎓'],
  [/เครื่องเขียน|stationary/i, '✏️'],

  // Pet
  [/หมา|แมว|สัตว์เลี้ยง|pet|อาหารสัตว์/i, '🐾'],

  // Income sources
  [/เงินเดือน|salary|เดือน/i, '💼'],
  [/โบนัส|bonus/i, '🎉'],
  [/ฟรีแลนซ์|freelance|งานพิเศษ/i, '💻'],
  [/ลงทุน|หุ้น|กองทุน|crypto|bitcoin|invest/i, '📈'],
  [/ขายของ|ขาย|ค้าขาย|sell/i, '🛒'],
  [/ดอกเบี้ย|interest|dividend|ปันผล/i, '💹'],
  [/ของขวัญ|gift|รับเงิน/i, '🎁'],
]

const EXPENSE_FALLBACK = '💸'
const INCOME_FALLBACK = '💰'

export function suggestEmoji(name: string, type: 'income' | 'expense'): string {
  for (const [pattern, emoji] of rules) {
    if (pattern.test(name)) return emoji
  }
  return type === 'income' ? INCOME_FALLBACK : EXPENSE_FALLBACK
}
