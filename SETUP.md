# วิธี Setup Money Tracker (Firebase)

## 1. สร้าง Firebase Project

1. ไปที่ https://console.firebase.google.com → **Add project**
2. ตั้งชื่อ (เช่น `money-tracker`) → ปิด Google Analytics ได้ → Create

## 2. เปิด Google Authentication

1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** → **Google** → Enable → Save

## 3. สร้าง Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. เลือก **Start in production mode** → เลือก region ใกล้ที่สุด (เช่น `asia-southeast1`)
3. ไปที่ **Rules** tab → วางโค้ดจากไฟล์ `firestore.rules` → Publish

## 4. เพิ่ม Composite Index

Firestore ต้องการ index สำหรับ query ที่มีหลาย field:

1. Firebase Console → **Firestore** → **Indexes** → **Add index**
2. Collection ID: `transactions`
3. Fields:
   - `user_id` → Ascending
   - `date` → Ascending
   - `__name__` → Ascending
4. Click **Create**

(หรือรัน app แล้วคลิก link ใน browser console ที่ Firebase สร้างให้อัตโนมัติ)

## 5. ดึง Config

1. Firebase Console → Project Overview → **Web app** (icon `</>`) → Register app
2. คัดลอกค่า `firebaseConfig`

## 6. ใส่ Environment Variables

เปิดไฟล์ `.env.local` ใส่ค่าจาก firebaseConfig:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:xxx:web:xxx
```

## 7. รัน Dev Server

```bash
npm run dev
```

เปิด http://localhost:3000

## 8. Deploy บน Vercel (ฟรี)

```bash
npx vercel
```

อย่าลืมใส่ Environment Variables ใน Vercel dashboard ด้วย
(Project Settings → Environment Variables)
