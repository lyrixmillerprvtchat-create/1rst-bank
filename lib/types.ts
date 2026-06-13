export interface Profile {
  id: string
  user_id: string
  full_name: string
  account_number: string
  tier: string
  role: 'user' | 'admin'
  phone: string
  created_at: string
  status: 'active' | 'suspended' | 'frozen'
  kyc_status: 'pending' | 'approved' | 'rejected'
}

export interface Account {
  id: string
  user_id: string
  account_number: string
  balance: number
  created_at: string
}

export interface Transaction {
  id: string
  sender_account: string
  receiver_account: string
  amount: number
  type: 'credit' | 'debit' | 'transfer'
  description: string
  created_at: string
}
