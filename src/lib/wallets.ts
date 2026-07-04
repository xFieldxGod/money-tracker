import type { Transaction, Wallet } from '@/types'

export const DEFAULT_WALLET: Wallet = { id: 'main', name: 'เป๋าหลัก', icon: '👛' }

// รายการเก่า/เป๋าที่ถูกลบ ให้ตกเป็นของเป๋าใบแรกเสมอ — เป็นกติกาเดียวที่ใช้แทน migration
export function resolveWalletId(id: string | undefined, wallets: Wallet[]): string {
  if (id && wallets.some(w => w.id === id)) return id
  return wallets[0]?.id ?? DEFAULT_WALLET.id
}

export function txMatchesWallet(tx: Transaction, selected: string | 'all', wallets: Wallet[]): boolean {
  if (selected === 'all') return true
  if (tx.type === 'transfer') {
    return (
      resolveWalletId(tx.wallet_id, wallets) === selected ||
      resolveWalletId(tx.to_wallet_id, wallets) === selected
    )
  }
  return resolveWalletId(tx.wallet_id, wallets) === selected
}

// ยอดพร้อมเครื่องหมายตามมุมมองเป๋าที่เลือก
// income +, expense − เสมอ; โอน: มุมมองทุกเป๋า = 0, เป๋าต้นทาง −, เป๋าปลายทาง +
export function signedAmount(tx: Transaction, selected: string | 'all', wallets: Wallet[]): number {
  if (tx.type === 'income') return tx.amount
  if (tx.type === 'expense') return -tx.amount
  // transfer
  if (selected === 'all') return 0
  const from = resolveWalletId(tx.wallet_id, wallets)
  const to = resolveWalletId(tx.to_wallet_id, wallets)
  if (from === to) return 0 // เป๋าถูกลบจนสองขาชนกัน
  if (from === selected) return -tx.amount
  if (to === selected) return tx.amount
  return 0
}

export function walletName(id: string | undefined, wallets: Wallet[]): Wallet {
  const resolved = resolveWalletId(id, wallets)
  return wallets.find(w => w.id === resolved) ?? DEFAULT_WALLET
}
