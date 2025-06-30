import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing Supabase connectivity...")
    
    // Check environment variables
    const envCheck = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      FAL_KEY: !!process.env.FAL_KEY,
      NETLIFY: process.env.NETLIFY === 'true'
    }
    
    console.log("🌍 Environment variables:", envCheck)
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({
        success: false,
        error: "Missing Supabase environment variables",
        envCheck
      }, { status: 500 })
    }
    
    // Test Supabase client creation
    let supabase
    try {
      supabase = await createServerClient()
      console.log("✅ Supabase client created successfully")
    } catch (clientError) {
      console.error("❌ Failed to create Supabase client:", clientError)
      return NextResponse.json({
        success: false,
        error: "Failed to create Supabase client",
        details: clientError instanceof Error ? clientError.message : String(clientError),
        envCheck
      }, { status: 500 })
    }
    
    // Test basic auth (without requiring a user)
    try {
      const { data, error } = await supabase.auth.getSession()
      console.log("✅ Auth getSession succeeded")
      
      // Test database connection with a simple query
      const { data: testData, error: dbError } = await supabase
        .from("generated_images")
        .select("count")
        .limit(1)
      
      if (dbError) {
        console.error("❌ Database test query failed:", dbError)
        return NextResponse.json({
          success: false,
          error: "Database connection failed",
          details: dbError.message,
          envCheck,
          authTest: "✅ Success"
        }, { status: 500 })
      }
      
      console.log("✅ Database connection successful")
      
      return NextResponse.json({
        success: true,
        message: "Supabase connectivity test passed",
        envCheck,
        authTest: "✅ Success", 
        dbTest: "✅ Success",
        timestamp: new Date().toISOString()
      })
      
    } catch (authError) {
      console.error("❌ Auth test failed:", authError)
      return NextResponse.json({
        success: false,
        error: "Auth test failed",
        details: authError instanceof Error ? authError.message : String(authError),
        envCheck
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("❌ Supabase test failed:", error)
    return NextResponse.json({
      success: false,
      error: "Supabase test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 