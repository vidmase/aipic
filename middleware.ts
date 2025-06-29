import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  })

  // Skip middleware for static files and API routes
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set(name, value)
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Get user with proper error handling
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    // Log errors but don't block navigation
    if (error) {
      console.log('Auth user error:', error.message)
    }

    const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
    const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard")

    // If user is not signed in and trying to access dashboard, redirect to signin
    if (!user && isDashboardPage) {
      const redirectUrl = new URL("/auth/signin", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is signed in and on auth pages, redirect to dashboard
    if (user && isAuthPage) {
      const redirectUrl = new URL("/dashboard", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request to proceed without redirect
    return supabaseResponse
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
