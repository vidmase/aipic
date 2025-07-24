import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
  }
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not set" }, { status: 500 })
    }
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `Improve this prompt for AI image generation. Only return the improved prompt, nothing else.\n\n${prompt}` }] }
        ]
      }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.error?.message || "Gemini API error" }, { status: 500 })
    }
    const data = await response.json()
    const improved = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!improved) {
      return NextResponse.json({ error: "Failed to improve prompt" }, { status: 500 })
    }
    return NextResponse.json({ improved })
  } catch {
    return NextResponse.json({ error: "Failed to improve prompt" }, { status: 500 })
  }
} 