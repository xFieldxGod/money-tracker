import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// โดเมนที่ลงทะเบียน redirect URI (https://<โดเมน>/__/auth/handler) ไว้กับ Google OAuth client แล้ว
// ถ้ารันอยู่บนโดเมนพวกนี้ ให้ใช้โดเมนตัวเองเป็น authDomain — หน้า auth handler จะถูก proxy
// ผ่าน rewrites ใน next.config.ts ทำให้อยู่ origin เดียวกับแอป (แก้ปัญหาล็อกอินใน in-app browser)
const SAME_ORIGIN_AUTH_DOMAINS = [
  'money-tracker-murex-two.vercel.app',
  'money-tracker-xfieldxgods-projects.vercel.app',
]

const authDomain =
  typeof window !== 'undefined' && SAME_ORIGIN_AUTH_DOMAINS.includes(window.location.host)
    ? window.location.host
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
