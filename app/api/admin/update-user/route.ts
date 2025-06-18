import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { ADMIN_EMAILS } from "@/lib/admin-config"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const { userId, isPremium } = await request.json()

    if (!userId || typeof isPremium !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      )
    }

    // Update user premium status and tier
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        is_premium: isPremium,
        user_tier: isPremium ? 'premium' : 'free',
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json(
        { error: "Failed to update user status" },
        { status: 500 }
      )
    }

    // Log the admin action (optional - you could create an admin_logs table)
    console.log(`Admin ${user.email} ${isPremium ? 'granted' : 'removed'} premium access for user ${userId}`)

    return NextResponse.json(
      { 
        success: true,
        message: `User ${isPremium ? 'upgraded to' : 'downgraded from'} premium status`
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("Admin update user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 