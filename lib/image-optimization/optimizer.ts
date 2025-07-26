import sharp from 'sharp';
import * as Sentry from '@sentry/nextjs';

export interface OptimizationOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface OptimizationResult {
  webp: Buffer;
  jpeg: Buffer;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

export class ImageOptimizer {
  static async optimizeForWeb(
    imageBuffer: Buffer, 
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const { 
      quality = 85, 
      width,
      height,
      fit = 'cover'
    } = options;
    
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Create base pipeline
      let pipeline = sharp(imageBuffer);
      
      // Apply resizing if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize({
          width,
          height,
          fit,
          withoutEnlargement: true
        });
      }
      
      // Generate WebP version (primary format)
      const webpBuffer = await pipeline
        .clone()
        .webp({ 
          quality, 
          effort: 6,
          nearLossless: quality > 90
        })
        .toBuffer();
        
      // Generate JPEG version (fallback)
      const jpegBuffer = await pipeline
        .clone()
        .jpeg({ 
          quality, 
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
        
      return {
        webp: webpBuffer,
        jpeg: jpegBuffer,
        originalSize: imageBuffer.length,
        optimizedSize: webpBuffer.length,
        savings: Math.round((1 - webpBuffer.length / imageBuffer.length) * 100),
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || 'unknown'
        }
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: 'image-optimization',
          operation: 'optimize-for-web'
        },
        extra: {
          options,
          originalSize: imageBuffer.length
        }
      });
      throw new Error('Image optimization failed');
    }
  }

  static async createThumbnail(
    imageBuffer: Buffer,
    size: number = 300,
    quality: number = 80
  ): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality, effort: 4 })
        .toBuffer();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: 'image-optimization',
          operation: 'create-thumbnail'
        },
        extra: { size, quality }
      });
      throw new Error('Thumbnail creation failed');
    }
  }

  static async validateImage(imageBuffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      // Check if it's a valid image format
      const validFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff'];
      if (!metadata.format || !validFormats.includes(metadata.format)) {
        return false;
      }
      
      // Check dimensions are reasonable
      if (!metadata.width || !metadata.height || 
          metadata.width > 10000 || metadata.height > 10000) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  static getOptimalQuality(fileSize: number): number {
    // Adjust quality based on file size to balance quality and performance
    if (fileSize < 100 * 1024) return 95; // < 100KB - high quality
    if (fileSize < 500 * 1024) return 85; // < 500KB - good quality
    if (fileSize < 2 * 1024 * 1024) return 75; // < 2MB - medium quality
    return 65; // > 2MB - lower quality for performance
  }
} 