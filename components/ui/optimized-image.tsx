import Image from 'next/image';
import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({ 
  src, 
  alt, 
  width,
  height,
  priority = false,
  className,
  fill = false,
  sizes,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  ...props 
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  // Generate optimized src with WebP support
  const getOptimizedSrc = (originalSrc: string) => {
    if (imageError) return '/placeholder.svg';
    
    // If it's already optimized or a placeholder, return as-is
    if (originalSrc.includes('placeholder') || originalSrc.includes('data:') || originalSrc.includes('.svg')) {
      return originalSrc;
    }
    
    // For now, return the original URL directly to avoid proxy issues
    // TODO: Re-enable proxy optimization once thoroughly tested
    return originalSrc;
    
    // For external URLs (like FAL.AI), we'll optimize them through our API
    // if (originalSrc.startsWith('http')) {
    //   return `/api/proxy-image?url=${encodeURIComponent(originalSrc)}&format=webp&quality=${quality}`;
    // }
    // 
    // return originalSrc;
  };

  const containerClasses = cn(
    "relative overflow-hidden",
    className
  );

  return (
    <div className={containerClasses}>
      {isLoading && !imageError && (
        <Skeleton 
          className={cn(
            "absolute inset-0 bg-muted animate-pulse",
            fill ? "w-full h-full" : "",
            width && height ? `w-[${width}px] h-[${height}px]` : ""
          )}
        />
      )}
      
      <Image
        src={getOptimizedSrc(src)}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes || (fill ? "100vw" : undefined)}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          imageError ? "object-cover" : ""
        )}
        {...props}
      />
      
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Higher-order component for lazy loading
interface LazyImageProps extends OptimizedImageProps {
  threshold?: number;
  rootMargin?: string;
}

export function LazyOptimizedImage({
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}: LazyImageProps) {
  const [inView, setInView] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  // Use Intersection Observer for lazy loading
  React.useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);

  return (
    <div ref={setRef} className={props.className}>
      {inView ? (
        <OptimizedImage {...props} />
      ) : (
        <Skeleton 
          className={cn(
            "w-full h-full bg-muted animate-pulse",
            props.fill ? "absolute inset-0" : "",
            props.width && props.height ? `w-[${props.width}px] h-[${props.height}px]` : ""
          )}
        />
      )}
    </div>
  );
} 