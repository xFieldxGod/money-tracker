export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|Line\/|KAKAOTALK|Twitter|Snapchat|TikTok|Musical\.ly|WeChat|MicroMessenger/i.test(ua)
    || (ua.includes('Mobile') && ua.includes('wv')) // Android WebView
}
