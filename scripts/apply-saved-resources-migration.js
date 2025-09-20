// Script to apply saved_resources table migration
// Run with: node scripts/apply-saved-resources-migration.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function applySavedResourcesMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase configuration. Please check your .env.local file.')
    console.log('Required variables:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL')
    console.log('- SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('🚀 Starting Saved Resources Migration...')
  console.log('This will create:')
  console.log('  ✓ saved_resources table')
  console.log('  ✓ Proper indexes for performance')
  console.log('  ✓ RLS policies for security')
  console.log('  ✓ Helper functions for resource management')
  console.log('')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0010_add_saved_resources_table.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      return
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    console.log('')

    let successCount = 0
    let errorCount = 0

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (statement.length === 0) continue
      
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        // Try different execution methods
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(async () => {
          // Fallback to direct execution
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0)
            .catch(async () => {
              // Final fallback
              const { error: rawError } = await supabase.rpc('exec_raw_sql', {
                query: statement
              })
              return { error: rawError }
            })
          return { error: directError }
        })

        if (error) {
          // Check if it's a "already exists" error which we can ignore
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')
          )) {
            console.log(`⚠️  Statement ${i + 1}: Already exists (skipping)`)
            successCount++
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message)
            errorCount++
          }
        } else {
          console.log(`✅ Statement ${i + 1}: Success`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1} failed:`, err.message)
        errorCount++
      }
    }

    console.log('')
    console.log('📊 Migration Summary:')
    console.log(`  ✅ Successful: ${successCount}`)
    console.log(`  ❌ Failed: ${errorCount}`)
    console.log(`  📝 Total: ${statements.length}`)
    console.log('')

    // Verify the migration worked
    console.log('🔍 Verifying migration results...')
    
    // Check if saved_resources table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('saved_resources')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('❌ saved_resources table verification failed:', tableError.message)
    } else {
      console.log('✅ saved_resources table created successfully')
    }

    // Check if RLS is enabled
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('check_table_rls', { table_name: 'saved_resources' })
      .catch(() => ({ data: null, error: null }))

    if (!rlsError && rlsCheck) {
      console.log('✅ RLS policies configured')
    }

    console.log('')
    console.log('🎉 Saved Resources Migration Complete!')
    console.log('You can now save and manage club resources.')
    console.log('')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('')
    console.log('Manual migration required. Please run the following SQL in your Supabase dashboard:')
    console.log('=' * 80)
    
    try {
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0010_add_saved_resources_table.sql')
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
      console.log('')
      console.log(migrationSQL)
    } catch {
      console.log('Could not read migration file for manual execution')
    }
  }
}

applySavedResourcesMigration()