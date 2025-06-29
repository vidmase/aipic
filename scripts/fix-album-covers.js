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

async function fixAlbumCovers() {
  console.log('🔧 Fixing album cover images...')
  
  try {
    // Find albums without cover images
    const { data: albumsWithoutCovers, error: fetchError } = await supabase
      .from('albums')
      .select(`
        id,
        name,
        cover_image_url,
        album_images(
          generated_images(image_url, created_at)
        )
      `)
      .is('cover_image_url', null)
    
    if (fetchError) {
      console.error('❌ Error fetching albums:', fetchError)
      return
    }
    
    console.log(`📋 Found ${albumsWithoutCovers?.length || 0} albums without cover images`)
    
    for (const album of albumsWithoutCovers || []) {
      if (album.album_images?.length > 0) {
        // Get the first (oldest) image as cover
        const firstImage = album.album_images
          .map(ai => ai.generated_images)
          .filter(Boolean)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]
        
        if (firstImage?.image_url) {
          console.log(`🖼️ Setting cover for album "${album.name}": ${firstImage.image_url}`)
          
          const { error: updateError } = await supabase
            .from('albums')
            .update({ cover_image_url: firstImage.image_url })
            .eq('id', album.id)
          
          if (updateError) {
            console.error(`❌ Error updating album ${album.name}:`, updateError)
          } else {
            console.log(`✅ Updated cover for album "${album.name}"`)
          }
        }
      } else {
        console.log(`📭 Album "${album.name}" has no images`)
      }
    }
    
    console.log('🎉 Album cover fix completed!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixAlbumCovers().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
}) 