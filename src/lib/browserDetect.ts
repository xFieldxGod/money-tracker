export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''

  // แอปที่ประกาศตัวเองใน user agent (LINE, Facebook/Messenger, IG, TikTok, Google app ฯลฯ)
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Liff|KAKAOTALK|Twitter|Snapchat|TikTok|Musical\.ly|WeChat|MicroMessenger|Telegram|Zalo|GSA\//i.test(ua)) {
    return true
  }

  // Android WebView
  if (ua.includes('Mobile') && ua.includes('wv')) return true

  // iOS WebView: UA มี iPhone/iPad แต่ไม่มีคำว่า Safari
  // (เบราว์เซอร์จริงบน iOS ทุกตัวรวมถึง Chrome/Firefox จะมี "Safari" ต่อท้ายเสมอ)
  if (/iPhone|iPad|iPod/.test(ua) && !/Safari/i.test(ua)) return true

  return false
}
