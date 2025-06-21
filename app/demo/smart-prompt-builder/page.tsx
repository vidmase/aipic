"use client"

import React, { useState } from "react"
import { SmartPromptBuilder } from "@/components/dashboard/smart-prompt-builder"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SmartPromptBuilderDemo() {
  const [finalPrompt, setFinalPrompt] = useState("")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Smart Prompt Builder Demo</CardTitle>
              <CardDescription className="text-white/70">
                Experience the power of AI-assisted prompt creation with intelligent suggestions for style, mood, lighting, and composition.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Smart Prompt Builder */}
        <SmartPromptBuilder
          initialPrompt="A beautiful landscape"
          onPromptChange={setFinalPrompt}
        />

        {/* Final Result */}
        {finalPrompt && (
          <Card className="mt-8 bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Generated Prompt</CardTitle>
              <CardDescription className="text-white/70">
                This is your final enhanced prompt ready for image generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black/20 p-4 rounded-lg">
                <p className="text-white font-mono text-sm">{finalPrompt}</p>
              </div>
              <div className="flex gap-4 mt-4">
                <Button 
                  onClick={() => navigator.clipboard.writeText(finalPrompt)}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Copy Prompt
                </Button>
                <Link href="/dashboard">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Use in Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 