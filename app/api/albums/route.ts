import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { albumId, name } = body

    // Validate required fields
    if (!albumId || !name) {
      return NextResponse.json({ 
        error: "Missing required fields: albumId and name are required" 
      }, { status: 400 })
    }

    // Validate name length
    if (name.trim().length === 0 || name.trim().length > 100) {
      return NextResponse.json({ 
        error: "Album name must be between 1 and 100 characters" 
      }, { status: 400 })
    }

    // Update the album name
    const { data: updatedAlbum, error: updateError } = await supabase
      .from('albums')
      .update({ 
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', albumId)
      .eq('user_id', user.id) // Ensure user owns the album
      .select()
      .single()

    if (updateError) {
      console.error('Error updating album name:', updateError)
      return NextResponse.json({ 
        error: "Failed to update album name",
        details: updateError.message
      }, { status: 500 })
    }

    if (!updatedAlbum) {
      return NextResponse.json({ 
        error: "Album not found or you don't have permission to edit it" 
      }, { status: 404 })
    }

    console.log('Album name updated successfully:', updatedAlbum)

    return NextResponse.json({ 
      success: true, 
      album: updatedAlbum 
    })

  } catch (error) {
    console.error('Album update API error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 