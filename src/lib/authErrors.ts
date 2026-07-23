// แปลง Firebase Auth error code เป็นข้อความภาษาไทย
// คืน null สำหรับกรณีที่ผู้ใช้ยกเลิกเอง (ไม่ต้องแสดง error)
export function authErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    case 'auth/email-already-in-use':
      return 'อีเมลนี้ถูกใช้สมัครไปแล้ว กรุณาเข้าสู่ระบบแทน'
    case 'auth/invalid-email':
      return 'รูปแบบอีเมลไม่ถูกต้อง'
    case 'auth/weak-password':
      return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    case 'auth/too-many-requests':
      return 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่'
    case 'auth/network-request-failed':
      return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาตรวจสอบสัญญาณแล้วลองใหม่'
    case 'auth/account-exists-with-different-credential':
      return 'อีเมลนี้เคยลงทะเบียนด้วยวิธีอื่น กรุณาเข้าสู่ระบบด้วยวิธีเดิม'
    case 'auth/operation-not-allowed':
      return 'วิธีเข้าสู่ระบบนี้ยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
    default:
      return 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'
  }
}
