// Check environment variables for Supabase configuration
console.log('🔍 Checking Supabase Environment Variables...\n');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_MATERIALS_BUCKET'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? 
    (varName.includes('KEY') ? `${value.substring(0, 20)}...` : value) : 
    'NOT SET';
  
  console.log(`${status} ${varName}: ${displayValue}`);
  
  if (!value) {
    allPresent = false;
  }
});

console.log('\n📋 Summary:');
if (allPresent) {
  console.log('✅ All required environment variables are set');
} else {
  console.log('❌ Some required environment variables are missing');
  console.log('\n💡 To fix this:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Fill in your Supabase project details');
  console.log('3. Restart the development server');
}

console.log('\n🔧 Current bucket configuration:');
console.log(`Bucket name: ${process.env.NEXT_PUBLIC_MATERIALS_BUCKET || 'materials'}`);

// Test Supabase connection if keys are present
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n🧪 Testing Supabase connection...');
  
  const { createClient } = require('@supabase/supabase-js');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
    
    console.log('✅ Supabase client created successfully');
    
    // Test a simple query
    supabase.storage.listBuckets()
      .then(({ data, error }) => {
        if (error) {
          console.log('❌ Storage access failed:', error.message);
        } else {
          console.log('✅ Storage access successful');
          console.log('📦 Available buckets:', data?.map(b => b.name).join(', ') || 'none');
        }
      })
      .catch(err => {
        console.log('❌ Storage test failed:', err.message);
      });
      
  } catch (error) {
    console.log('❌ Failed to create Supabase client:', error.message);
  }
} else {
  console.log('⏭ Skipping connection test (missing credentials)');
}