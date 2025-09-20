require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Setup storage bucket and policies for file uploads
async function setupStorageBucket() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('❌ Missing environment variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🚀 Setting up storage bucket and policies...');

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'materials');

    if (!bucketExists) {
      console.log('📦 Creating materials bucket...');
      const { error: createError } = await supabase.storage.createBucket('materials', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp'
        ]
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        return;
      }
      console.log('✅ Materials bucket created successfully');
    } else {
      console.log('⏭ Materials bucket already exists - SKIPPED');
    }

    // Run the SQL migration for storage policies
    console.log('🔐 Setting up storage policies...');
    
    const migrationSQL = `
      -- Policy 1: Allow authenticated users to upload files to their own folder
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'materials_upload_own'
        ) THEN
          CREATE POLICY "materials_upload_own" ON storage.objects
            FOR INSERT 
            TO authenticated
            WITH CHECK (
              bucket_id = 'materials' 
              AND (storage.foldername(name))[1] = auth.uid()::text
            );
          
          RAISE NOTICE '✓ Materials upload policy created successfully';
        ELSE
          RAISE NOTICE '⏭ Materials upload policy already exists - SKIPPED';
        END IF;
      END $$;

      -- Policy 2: Allow authenticated users to view files in their own folder
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'materials_select_own'
        ) THEN
          CREATE POLICY "materials_select_own" ON storage.objects
            FOR SELECT 
            TO authenticated
            USING (
              bucket_id = 'materials' 
              AND (storage.foldername(name))[1] = auth.uid()::text
            );
          
          RAISE NOTICE '✓ Materials select policy created successfully';
        ELSE
          RAISE NOTICE '⏭ Materials select policy already exists - SKIPPED';
        END IF;
      END $$;

      -- Policy 3: Allow authenticated users to update files in their own folder
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'materials_update_own'
        ) THEN
          CREATE POLICY "materials_update_own" ON storage.objects
            FOR UPDATE 
            TO authenticated
            USING (
              bucket_id = 'materials' 
              AND (storage.foldername(name))[1] = auth.uid()::text
            );
          
          RAISE NOTICE '✓ Materials update policy created successfully';
        ELSE
          RAISE NOTICE '⏭ Materials update policy already exists - SKIPPED';
        END IF;
      END $$;

      -- Policy 4: Allow authenticated users to delete files in their own folder
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'materials_delete_own'
        ) THEN
          CREATE POLICY "materials_delete_own" ON storage.objects
            FOR DELETE 
            TO authenticated
            USING (
              bucket_id = 'materials' 
              AND (storage.foldername(name))[1] = auth.uid()::text
            );
          
          RAISE NOTICE '✓ Materials delete policy created successfully';
        ELSE
          RAISE NOTICE '⏭ Materials delete policy already exists - SKIPPED';
        END IF;
      END $$;

      -- Policy 5: Allow service role to manage all files (for admin operations)
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'materials_service_role_all'
        ) THEN
          CREATE POLICY "materials_service_role_all" ON storage.objects
            FOR ALL 
            TO service_role
            USING (bucket_id = 'materials');
          
          RAISE NOTICE '✓ Materials service role policy created successfully';
        ELSE
          RAISE NOTICE '⏭ Materials service role policy already exists - SKIPPED';
        END IF;
      END $$;

      -- Enable RLS on storage.objects if not already enabled
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    `;

    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (sqlError) {
      console.error('❌ Error setting up storage policies:', sqlError.message);
      return;
    }

    console.log('✅ Storage policies set up successfully');
    console.log('🎉 Storage bucket and policies setup completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the setup
setupStorageBucket();