// Script to create the savings_goals table manually
// Run with: node scripts/create-savings-goals-table.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function createSavingsGoalsTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase configuration. Please check your .env.local file.')
    console.log('Required variables:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL')
    console.log('- SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('Creating savings_goals table...')

  try {
    // First, check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('savings_goals')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('✅ savings_goals table already exists!')
      return
    }

    if (!checkError.message.includes('does not exist')) {
      console.error('❌ Unexpected error checking table:', checkError.message)
      return
    }

    console.log('Table does not exist, creating it...')
    console.log('\n📋 Please run the following SQL in your Supabase dashboard:')
    console.log('\n' + '='.repeat(80))
    
    const sql = `-- Create savings_goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(12, 2) NOT NULL,
  current_amount numeric(12, 2) NOT NULL DEFAULT 0,
  deadline timestamptz NOT NULL,
  reminder_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "savings_goals_select_own" ON public.savings_goals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = savings_goals.user_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "savings_goals_insert_own" ON public.savings_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "savings_goals_update_own" ON public.savings_goals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = savings_goals.user_id
        AND u.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "savings_goals_delete_own" ON public.savings_goals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = savings_goals.user_id
        AND u.auth_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_created_at ON public.savings_goals (created_at);
CREATE INDEX IF NOT EXISTS idx_savings_goals_deadline ON public.savings_goals (deadline);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();`

    console.log(sql)
    console.log('\n' + '='.repeat(80))
    console.log('\n📝 Instructions:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the SQL above')
    console.log('4. Click "Run" to execute')
    console.log('5. Restart your development server')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createSavingsGoalsTable()