import { createServerClient } from "@/lib/supabase/server"
import { GalleryContent } from "@/components/gallery/gallery-content"

export default async function GalleryPage() {
  const supabase = createServerClient()

  // Get recent public images (you might want to add a public flag to your schema)
  const { data: images } = await supabase
    .from("generated_images")
    .select(`
      id,
      prompt,
      image_url,
      model,
      created_at,
      profiles!inner(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(24)

  return <GalleryContent images={images || []} />
}
