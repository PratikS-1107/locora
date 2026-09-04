import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbdzjnzlxfelscbodzor.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const MANIFEST_PATH = 'server/verified_40_images.json';

async function main() {
  console.log('================================================================');
  console.log('LOCORA SUPABASE STORAGE UPLOAD & COVER IMAGE SYNC PIPELINE');
  console.log('================================================================\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`ERROR: Manifest file not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log(`Loaded ${manifest.length} verified image records from ${MANIFEST_PATH}.\n`);

  if (!SERVICE_ROLE_KEY) {
    console.error('----------------------------------------------------------------');
    console.error('MISSING REQUIRED SERVER-SIDE CREDENTIAL:');
    console.error('----------------------------------------------------------------');
    console.error('SUPABASE_SERVICE_ROLE_KEY is not defined in your environment (.env).');
    console.error('');
    console.error('Because Supabase enforces Row Level Security on storage.buckets and public.trips,');
    console.error('server-side administrative uploads and updates require the Supabase Service Role Key.');
    console.error('');
    console.error('To proceed:');
    console.error('1. Add your service-role key to .env (for server use only, never in client code):');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>');
    console.error('');
    console.error('2. Run this script again:');
    console.error('   node server/upload_trip_images.js');
    console.error('');
    console.error('Alternatively, you can run the generated SQL script in the Supabase Dashboard:');
    console.error('   server/sync_cover_images.sql');
    console.error('----------------------------------------------------------------');
    process.exit(1);
  }

  // Initialize administrative Supabase client
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Step 1: Ensure bucket 'trip-images' exists
  console.log('Step 1: Checking/Creating "trip-images" bucket in Supabase Storage...');
  const { data: existingBucket, error: bucketGetErr } = await supabase.storage.getBucket('trip-images');
  
  if (!existingBucket) {
    console.log('Bucket "trip-images" not found. Creating public bucket...');
    const { data: createBucketData, error: createBucketErr } = await supabase.storage.createBucket('trip-images', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (createBucketErr) {
      console.error('Failed to create "trip-images" bucket:', createBucketErr.message);
      process.exit(1);
    }
    console.log('Successfully created "trip-images" public bucket.');
  } else {
    console.log('Bucket "trip-images" exists.');
  }

  // Step 2: Download and upload each of the 40 verified images
  console.log('\nStep 2: Processing 40 verified images...\n');

  let uploadedCount = 0;
  let verifiedStorageCount = 0;
  let updatedDbCount = 0;
  const failedUploads = [];

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];
    const indexStr = `[${i + 1}/${manifest.length}]`;
    const relativeStoragePath = item.storagePath.replace(/^trip-images\//, '');

    try {
      // 2.1 Download binary image
      console.log(`${indexStr} Downloading "${item.title}" (${item.destination})...`);
      const downloadRes = await fetch(item.directDownloadUrl, {
        headers: {
          'User-Agent': 'LocoraTravelDestinationUploader/1.0 (https://locora.travel; contact@locora.travel)'
        }
      });

      if (!downloadRes.ok) {
        throw new Error(`Download HTTP ${downloadRes.status}: ${downloadRes.statusText}`);
      }

      const arrayBuffer = await downloadRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 1000) {
        throw new Error(`Downloaded file too small (${buffer.length} bytes), not a valid image`);
      }

      // 2.2 Upload to Supabase Storage with upsert
      console.log(`${indexStr} Uploading to trip-images/${relativeStoragePath} (${Math.round(buffer.length / 1024)} KB)...`);
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('trip-images')
        .upload(relativeStoragePath, buffer, {
          contentType: item.mimeType || 'image/jpeg',
          upsert: true
        });

      if (uploadErr) {
        throw uploadErr;
      }
      uploadedCount++;

      // 2.3 Verify object exists in storage via public HEAD request
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/trip-images/${relativeStoragePath}`;
      const verifyRes = await fetch(publicUrl, { method: 'HEAD' });
      if (verifyRes.status !== 200) {
        throw new Error(`Storage object verification failed: Public HEAD returned HTTP ${verifyRes.status} for ${publicUrl}`);
      }
      verifiedStorageCount++;
      console.log(`${indexStr} Verified Storage object: ${relativeStoragePath} (HTTP 200)`);

      // 2.4 Update database record
      const { data: updatedRows, error: dbErr } = await supabase
        .from('trips')
        .update({
          cover_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.tripId)
        .select();

      if (dbErr) {
        throw new Error(`DB update error for trip ${item.tripId}: ${dbErr.message}`);
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(`DB update affected 0 rows for trip ${item.tripId}`);
      }
      updatedDbCount++;

    } catch (err) {
      console.error(`${indexStr} FAILED:`, err.message);
      failedUploads.push({
        tripId: item.tripId,
        title: item.title,
        storagePath: item.storagePath,
        reason: err.message
      });
    }

    // Polite delay between uploads
    await new Promise(r => setTimeout(r, 150));
  }

  // Step 3: Final Strict Verification of all 40 exact manifest items
  console.log('\n================================================================');
  console.log('FINAL VERIFICATION');
  console.log('================================================================');

  let allManifestStorageObjectsExist = true;
  const missingStoragePaths = [];

  console.log('Verifying exact storage paths for all 40 manifest records...');
  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];
    const relativeStoragePath = item.storagePath.replace(/^trip-images\//, '');
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/trip-images/${relativeStoragePath}`;
    try {
      const headRes = await fetch(publicUrl, { method: 'HEAD' });
      if (headRes.status !== 200) {
        allManifestStorageObjectsExist = false;
        missingStoragePaths.push({ path: item.storagePath, status: headRes.status });
      }
    } catch (e) {
      allManifestStorageObjectsExist = false;
      missingStoragePaths.push({ path: item.storagePath, error: e.message });
    }
  }

  // Verify DB state
  const { data: dbTrips, error: dbQueryErr } = await supabase
    .from('trips')
    .select('id, title, trip_source, cover_image_url')
    .in('trip_source', ['template', 'community'])
    .order('trip_source', { ascending: true })
    .order('title', { ascending: true });

  const populatedCount = (dbTrips || []).filter(t => t.cover_image_url && t.cover_image_url.includes('trip-images')).length;

  console.log(`\nFinal Summary:`);
  console.log(`- Uploaded images: ${uploadedCount} / ${manifest.length}`);
  console.log(`- Storage objects verified: ${verifiedStorageCount} / ${manifest.length}`);
  console.log(`- Database records updated: ${updatedDbCount} / ${manifest.length}`);
  console.log(`- All 40 exact manifest storage paths confirmed: ${allManifestStorageObjectsExist ? 'YES' : 'NO'}`);
  console.log(`- Database trips with valid cover_image_url: ${populatedCount} / ${dbTrips?.length || 0}`);

  const isCompleteSuccess = (
    uploadedCount === 40 &&
    verifiedStorageCount === 40 &&
    updatedDbCount === 40 &&
    failedUploads.length === 0 &&
    allManifestStorageObjectsExist === true &&
    populatedCount === 40
  );

  if (isCompleteSuccess) {
    console.log('\nAll 40/40 images uploaded, verified in storage, and updated in database successfully!');
  } else {
    console.error('\nFAILURE: Pipeline did not complete all 40/40 uploads, verifications, and database updates.');
    if (failedUploads.length > 0) {
      console.error('\nFailed uploads:');
      console.error(JSON.stringify(failedUploads, null, 2));
    }
    if (missingStoragePaths.length > 0) {
      console.error('\nMissing / non-200 storage paths:');
      console.error(JSON.stringify(missingStoragePaths, null, 2));
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
