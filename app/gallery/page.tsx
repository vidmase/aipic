import { createServerClient } from "@/lib/supabase/server"
import { GalleryContent } from "@/components/gallery/gallery-content"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function GalleryPage() {
  const supabase = createServerClient()

  // Get only the first 6 recent public images
  const { data: rawImages } = await supabase
    .from("generated_images")
    .select(`
      id,
      prompt,
      image_url,
      model,
      created_at,
      profiles(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(6)

  // Transform the data to match the expected type
  const images = rawImages?.map(image => ({
    ...image,
    profiles: Array.isArray(image.profiles) ? image.profiles[0] : image.profiles
  })) || []

  return (
    <>
      <GalleryContent images={images || []} />
      <div className="max-w-2xl mx-auto mt-12 mb-20 text-center p-8 rounded-2xl bg-gradient-to-r from-purple-100 via-blue-100 to-cyan-100 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 shadow-lg">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Want to see more?</h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">Log in or create a free account to unlock the full community gallery and discover even more inspiring AI art.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md hover:from-blue-600 hover:to-purple-600">
            <Link href="/auth/login">Log In</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-8 py-3 text-lg font-semibold border-2 border-blue-400 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900">
            <Link href="/auth/signup">Create Account</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
