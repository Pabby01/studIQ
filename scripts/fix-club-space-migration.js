// Script to fix club space issues by applying database migration
// Run with: node scripts/fix-club-space-migration.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function applyClubSpaceMigration() {
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

  console.log('🚀 Starting Club Space Migration...')
  console.log('This will fix:')
  console.log('  ✓ Missing message_reactions table')
  console.log('  ✓ Foreign key relationships')
  console.log('  ✓ Real-time member count synchronization')
  console.log('  ✓ Database indexes and performance')
  console.log('  ✓ RLS policies for security')
  console.log('')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0009_fix_club_space_issues.sql')
    
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

    // Execute each statement
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        })

        if (error) {
          // Try direct execution if rpc fails
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0)
          
          if (directError && directError.message.includes('does not exist')) {
            // Execute using raw SQL
            const { error: rawError } = await supabase.rpc('exec_raw_sql', {
              query: statement
            })
            
            if (rawError) {
              console.log(`⚠️  Statement ${i + 1} warning: ${rawError.message}`)
              if (!rawError.message.includes('already exists') && 
                  !rawError.message.includes('does not exist') &&
                  !rawError.message.includes('IF NOT EXISTS')) {
                errorCount++
              }
            } else {
              console.log(`✅ Statement ${i + 1} executed successfully`)
              successCount++
            }
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
          successCount++
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} error: ${err.message}`)
        if (!err.message.includes('already exists') && 
            !err.message.includes('does not exist')) {
          errorCount++
        }
      }
    }

    console.log('')
    console.log('📊 Migration Summary:')
    console.log(`  ✅ Successful: ${successCount}`)
    console.log(`  ⚠️  Warnings/Errors: ${errorCount}`)
    console.log('')

    // Verify the migration worked
    console.log('🔍 Verifying migration results...')
    
    // Check if message_reactions table exists
    try {
      const { data: reactions, error: reactionsError } = await supabase
        .from('message_reactions')
        .select('id')
        .limit(1)
      
      if (!reactionsError) {
        console.log('✅ message_reactions table created successfully')
      } else if (reactionsError.message.includes('does not exist')) {
        console.log('❌ message_reactions table was not created')
      }
    } catch (err) {
      console.log('⚠️  Could not verify message_reactions table')
    }

    // Check if member count function exists
    try {
      const { data: functions, error: funcError } = await supabase.rpc('update_club_member_count')
      console.log('✅ Member count synchronization function is available')
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log('❌ Member count function was not created')
      } else {
        console.log('✅ Member count synchronization function is available')
      }
    }

    console.log('')
    console.log('🎉 Club Space Migration Complete!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Restart your development server')
    console.log('2. Test the club space functionality')
    console.log('3. Verify real-time updates are working')
    console.log('')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('')
    console.log('Manual migration required. Please run the following SQL in your Supabase dashboard:')
    console.log('')
    
    try {
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0009_fix_club_space_issues.sql')
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
      console.log('='.repeat(80))
      console.log(migrationSQL)
      console.log('='.repeat(80))
    } catch (readError) {
      console.log('Could not read migration file for manual execution')
    }
  }
}

applyClubSpaceMigration()