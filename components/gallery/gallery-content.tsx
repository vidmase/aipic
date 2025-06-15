"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface GalleryImage {
  id: string
  prompt: string
  image_url: string
  model: string
  created_at: string
  profiles: {
    full_name: string | null
  }
}

interface GalleryContentProps {
  images: GalleryImage[]
}

export function GalleryContent({ images }: GalleryContentProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-2 py-3 sm:px-4 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between">
              <Button variant="ghost" asChild className="px-2 py-1">
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AI Image Gallery
                </span>
              </div>
              <Button asChild className="ml-2 px-3 py-2 text-sm sm:text-base">
                <Link href="/auth/signup">Start Creating</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 py-6 sm:px-4 sm:py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Gallery Highlights</h1>
          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300">
            See standout AI creations from our community.
          </p>
        </div>

        {images.length === 0 ? (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">No images in the gallery yet. Be the first to create!</p>
              <Button className="mt-4" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => (
              <Card
                key={image.id}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden"
              >
                <div className="relative aspect-square">
                  <Image src={image.image_url || "/placeholder.svg"} alt={image.prompt} fill className="object-cover" />
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{image.prompt}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{image.profiles.full_name || "Anonymous"}</span>
                    <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
