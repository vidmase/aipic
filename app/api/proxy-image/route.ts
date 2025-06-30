import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('URL parameter is required', { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status })
    }

    const imageBlob = await response.blob()
    const headers = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })

    return new NextResponse(imageBlob, { status: 200, headers })
  } catch (error) {
    console.error('Proxy error:', error)
    return new NextResponse('Error proxying image', { status: 500 })
  }
} 