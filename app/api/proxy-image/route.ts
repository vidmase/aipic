import { NextRequest, NextResponse } from 'next/server';
import { ImageOptimizer } from '@/lib/image-optimization/optimizer';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');
    const format = searchParams.get('format') || 'webp';
    const quality = parseInt(searchParams.get('quality') || '85');
    const width = searchParams.get('width') ? parseInt(searchParams.get('width')!) : undefined;
    const height = searchParams.get('height') ? parseInt(searchParams.get('height')!) : undefined;

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Security: Only allow specific domains
    const allowedDomains = [
      'fal.media',
      'storage.googleapis.com',
      'localhost',
      '127.0.0.1'
    ];

    if (!allowedDomains.some(domain => url.hostname.includes(domain))) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    // Fetch the original image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'AIPic Image Optimizer/1.0'
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Validate the image
    const isValid = await ImageOptimizer.validateImage(imageBuffer);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    // Optimize the image
    const optimizedResult = await ImageOptimizer.optimizeForWeb(imageBuffer, {
      quality,
      width,
      height,
      format: format as 'webp' | 'jpeg'
    });

    // Determine which format to serve based on Accept header
    const acceptHeader = request.headers.get('accept') || '';
    const supportsWebP = acceptHeader.includes('image/webp');
    
    const outputBuffer = (format === 'webp' && supportsWebP) 
      ? optimizedResult.webp 
      : optimizedResult.jpeg;
    
    const contentType = (format === 'webp' && supportsWebP) 
      ? 'image/webp' 
      : 'image/jpeg';

    // Set caching headers
    const response = new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'X-Original-Size': optimizedResult.originalSize.toString(),
        'X-Optimized-Size': optimizedResult.optimizedSize.toString(),
        'X-Savings': `${optimizedResult.savings}%`,
        'Vary': 'Accept'
      }
    });

    return response;

  } catch (error) {
    console.error('Image optimization error:', error);
    
    Sentry.captureException(error, {
      tags: {
        endpoint: 'proxy-image',
        operation: 'optimize'
      },
      extra: {
        url: request.nextUrl.searchParams.get('url'),
        format: request.nextUrl.searchParams.get('format'),
        quality: request.nextUrl.searchParams.get('quality')
      }
    });

    return NextResponse.json({ 
      error: 'Failed to optimize image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 