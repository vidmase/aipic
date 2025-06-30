import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    // Validate that it's a fal.ai URL for security
    if (!imageUrl.includes('fal.ai') && !imageUrl.includes('cdn.fal.ai')) {
      return NextResponse.json({ error: "Only fal.ai URLs are allowed" }, { status: 403 })
    }

    console.log('Proxying image URL:', imageUrl)

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js Image Proxy)',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText)
      return NextResponse.json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = await response.arrayBuffer()

    console.log('Successfully proxied image, size:', imageBuffer.byteLength, 'bytes')

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error("Error proxying image:", error)
    return NextResponse.json({ 
      error: "Failed to proxy image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 