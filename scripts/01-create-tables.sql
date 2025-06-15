-- Create users table (Supabase Auth handles this, but we'll extend it)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_images table
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'fal-ai/fast-sdxl',
  image_url TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create albums table
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create album_images table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.album_images (
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  image_id UUID REFERENCES public.generated_images(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (album_id, image_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_images ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for generated_images
CREATE POLICY "Users can view own images" ON public.generated_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for albums
CREATE POLICY "Users can view own albums" ON public.albums
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own albums" ON public.albums
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own albums" ON public.albums
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own albums" ON public.albums
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for album_images
CREATE POLICY "Users can view own album images" ON public.album_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_images.album_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own album images" ON public.album_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_images.album_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own album images" ON public.album_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_images.album_id AND a.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON public.generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_album_images_album_id ON public.album_images(album_id);
CREATE INDEX IF NOT EXISTS idx_album_images_image_id ON public.album_images(image_id);
