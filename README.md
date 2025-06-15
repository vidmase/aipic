# AI Pic Generator

A Next.js app using Supabase for authentication and image gallery, with AI image generation.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```
3. Create a `.env.local` file in the root with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   FAL_KEY=your-fal-ai-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

## Environment Variables
See `.env.example` for required variables.

## FAL.AI Integration
- This project uses [FAL.AI](https://fal.ai) for AI image generation.
- You must obtain an API key from your [FAL.AI dashboard](https://fal.ai) and set it as `FAL_KEY` in your `.env.local` file.
- The backend API route `/api/generate-image` uses this key to generate images from text prompts using FAL.AI models.

## Features
- Supabase Auth (Sign in, Sign up)
- AI Image Generation
- User Dashboard & Gallery

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

---

MIT License 