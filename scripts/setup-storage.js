#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please check your .env.local file for:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage for SeedEdit V3...')
  
  try {
    // 1. Create the reference-images bucket
    console.log('📦 Creating reference-images bucket...')
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

    console.log('🎉 Storage setup complete!')
    console.log('')
    console.log('📋 Summary:')
    console.log('- Bucket: reference-images')
    console.log('- Public access: Enabled')
    console.log('- File types: JPEG, PNG, WebP, GIF')
    console.log('- Size limit: 10MB')
    console.log('- File structure: reference-images/{user-id}/{timestamp}-{random}.ext')
    console.log('')
    console.log('⚠️  Important: You need to set up storage policies manually in the Supabase Dashboard')
    console.log('Go to: Storage → reference-images → Policies')
    console.log('')
    console.log('Create these policies:')
    console.log('1. "Users can upload their own files"')
    console.log('   - Operation: INSERT')
    console.log('   - Policy: auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('2. "Users can view their own files"')
    console.log('   - Operation: SELECT')
    console.log('   - Policy: auth.uid()::text = (storage.foldername(name))[1]')
    console.log('')
    console.log('3. "Users can delete their own files"')
    console.log('   - Operation: DELETE')
    console.log('   - Policy: auth.uid()::text = (storage.foldername(name))[1]')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
setupStorage().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
}) 