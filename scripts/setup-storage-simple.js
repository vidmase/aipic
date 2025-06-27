#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorageSimple() {
  console.log('🚀 Setting up reference-images bucket...')
  
  try {
    // Create the reference-images bucket
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('reference-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 10485760 // 10MB
      })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket already exists')
      } else {
        console.error('❌ Error creating bucket:', bucketError.message)
        return
      }
    } else {
      console.log('✅ Created reference-images bucket')
    }

    console.log('')
    console.log('🔧 MANUAL SETUP REQUIRED:')
    console.log('Go to your Supabase Dashboard:')
    console.log('1. Navigate to Storage → reference-images')
    console.log('2. Click on "Policies" tab')
    console.log('3. Click "New Policy"')
    console.log('4. Create these 3 policies:')
    console.log('')
    console.log('📝 Policy 1: "Users can upload their own files"')
    console.log('   - Operation: INSERT')
    console.log('   - Policy definition:')
    console.log('     bucket_id = \'reference-images\' AND auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('📝 Policy 2: "Users can view their own files"')
    console.log('   - Operation: SELECT')
    console.log('   - Policy definition:')
    console.log('     bucket_id = \'reference-images\' AND auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('📝 Policy 3: "Public can view reference images"')
    console.log('   - Operation: SELECT')
    console.log('   - Policy definition:')
    console.log('     bucket_id = \'reference-images\'')
    console.log('')
    console.log('⚠️  Alternative: Run the SQL script in scripts/setup-storage-policies.sql')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

setupStorageSimple().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
}) 