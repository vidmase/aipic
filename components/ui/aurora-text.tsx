"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface AuroraTextProps {
  children: React.ReactNode
  className?: string
}

export function AuroraText({ children, className }: AuroraTextProps) {
  return (
    <span
      className={cn(
        "relative inline-block font-extrabold tracking-tight select-none",
        "bg-gradient-to-r from-purple-600 via-blue-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent",
        "bg-[length:200%_100%] animate-aurora-text",
        className
      )}
      style={{
        backgroundImage: "linear-gradient(90deg, #9333ea 0%, #2563eb 25%, #06b6d4 50%, #8b5cf6 75%, #9333ea 100%)",
        backgroundSize: "200% 100%",
        animation: "aurora-text 6s ease-in-out infinite",
      }}
    >
      {children}
    </span>
  )
} 