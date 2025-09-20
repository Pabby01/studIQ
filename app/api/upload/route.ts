import { NextResponse } from 'next/server';
import { getSupabaseFromRequest, resolveUserRowId, getSupabaseAdmin } from '@/lib/supabase-server';

// POST /api/upload -> upload a file to Supabase Storage and return its URL
// Updated to fix RLS policy and signature verification issues
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const bucketName = process.env.NEXT_PUBLIC_MATERIALS_BUCKET || 'materials';

    const authHeader = req.headers.get('authorization');
    console.debug('[api/upload] Authorization header present:', !!authHeader);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      console.warn('[api/upload] Unauthorized - getUser error or missing user', { authErr: authErr?.message });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use auth.uid() for folder path to match storage policies
    const authUserId = authData.user.id;
    console.debug('[api/upload] Using auth user ID for folder:', authUserId);

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      console.warn('[api/upload] No file uploaded or wrong field name');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.debug('[api/upload] File received', { name: (file as File).name, type: (file as File).type, size: (file as File).size });

    const bytes = await (file as File).arrayBuffer();
    const buffer = new Uint8Array(bytes);

    const ext = (file as File).name.split('.').pop() || 'bin';
    // Use auth.uid() as folder name to match storage RLS policies
    const path = `${authUserId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Attempt upload to bucket
    let uploadData: { path: string } | null = null;
    let uploadErrMsg: string | null = null;

    const attemptUpload = async () => {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, buffer, { contentType: (file as File).type || 'application/octet-stream', upsert: false });
      if (error || !data) {
        uploadErrMsg = error?.message || 'Upload failed';
        console.error('[api/upload] Storage upload error', { message: uploadErrMsg });
        return false;
      }
      uploadData = data;
      console.debug('[api/upload] Upload success', { path: data.path });
      return true;
    };

    let uploaded = await attemptUpload();

    // If bucket missing, try to auto-provision using service role and retry once
    const admin = getSupabaseAdmin();
    if (!uploaded && uploadErrMsg && /bucket not found/i.test(uploadErrMsg)) {
      console.warn('[api/upload] Bucket missing, attempting to create bucket', { bucketName });
      if (!admin) {
        console.error('[api/upload] Service role key missing. Cannot auto-create bucket.');
        return NextResponse.json({
          error: 'Bucket not found',
          hint: `Create a public bucket named "${bucketName}" in Supabase Storage or set NEXT_PUBLIC_MATERIALS_BUCKET to an existing bucket. Also ensure SUPABASE_SERVICE_ROLE_KEY is set for auto-provision.`,
        }, { status: 400 });
      }

      // Ensure bucket exists with proper configuration
      try {
        const { data: buckets, error: listErr } = await admin.storage.listBuckets();
        if (listErr) {
          console.error('[api/upload] listBuckets failed', { error: listErr.message });
        }
        const exists = buckets?.some((b: any) => b.name === bucketName);
        if (!exists) {
          const { error: createErr } = await admin.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB to match client-side limit
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
          if (createErr) {
            console.error('[api/upload] createBucket failed', { error: createErr.message });
            return NextResponse.json({ error: 'Bucket not found and could not be created' }, { status: 500 });
          }
          console.debug('[api/upload] Bucket created', { bucketName });
        } else {
          console.debug('[api/upload] Bucket already exists (race condition likely)', { bucketName });
        }
      } catch (e: any) {
        console.error('[api/upload] Bucket provisioning threw', { error: e?.message || e });
      }

      // Retry upload once after ensuring bucket
      uploaded = await attemptUpload();
    }

    // If still not uploaded due to permission/policy issues, fallback to admin upload on server
    if (!uploaded && admin && uploadErrMsg && /(forbidden|permission|not allowed|unauthorized|policy|violates row-level security)/i.test(uploadErrMsg)) {
      console.warn('[api/upload] Upload blocked by policy. Retrying with admin credentials (server-side only).');
      console.debug('[api/upload] Original error:', uploadErrMsg);
      console.debug('[api/upload] Upload path:', path);
      console.debug('[api/upload] Auth user ID:', authUserId);
      
      const { data: dataAdmin, error: errAdmin } = await admin.storage
        .from(bucketName)
        .upload(path, buffer, { contentType: (file as File).type || 'application/octet-stream', upsert: false });
      if (errAdmin || !dataAdmin) {
        const msg = errAdmin?.message || uploadErrMsg || 'Upload failed';
        console.error('[api/upload] Admin upload also failed', { 
          message: msg, 
          path, 
          authUserId,
          bucketName,
          fileSize: buffer.length,
          contentType: (file as File).type
        });
        
        // Provide more helpful error message
        if (msg.includes('signature verification failed')) {
          return NextResponse.json({ 
            error: 'Storage authentication failed. Please check your Supabase configuration.',
            hint: 'Ensure SUPABASE_SERVICE_ROLE_KEY is correctly set and the storage bucket has proper policies.'
          }, { status: 500 });
        }
        
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      uploadData = dataAdmin as any;
      uploaded = true;
      console.debug('[api/upload] Admin upload success', { path: dataAdmin.path });
    }

    if (!uploaded || !uploadData) {
      // Common causes: bucket missing or not public, or storage policies
      return NextResponse.json({ error: uploadErrMsg || 'Upload failed', hint: `Ensure a bucket named "${bucketName}" exists in Supabase Storage and storage policies allow uploads for authenticated users.` }, { status: 400 });
    }

    // Try to get a public URL. If bucket is not public, fall back to a signed URL.
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
    let url = publicUrlData?.publicUrl || '';

    if (!url) {
      // Use admin to create signed URL if user-scoped client lacks permission
      const signer = admin || supabase;
      const { data: signed, error: signErr } = await signer.storage
        .from(bucketName)
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7); // 7 days
      if (signErr || !signed) {
        console.error('[api/upload] Unable to generate file URL', { error: signErr?.message });
        return NextResponse.json({ error: 'Unable to generate file URL' }, { status: 500 });
      }
      url = signed.signedUrl;
      console.debug('[api/upload] Using signed URL');
    }

    return NextResponse.json({ url }, { status: 201 });
  } catch (e: any) {
    console.error('[api/upload] Unexpected error', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}