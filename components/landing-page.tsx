"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import { inter, spaceGrotesk } from "@/lib/fonts"

export function LandingPage() {
  const [cursorPosition, setCursorPosition] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className={`relative min-h-screen bg-black text-white overflow-hidden ${inter.variable} ${spaceGrotesk.variable}`}>
      {/* Artistic Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/cta_logo.png"
          alt="AI Generated Art"
          fill
          className="object-cover opacity-70"
          priority
          quality={100}
        />
        {/* Artistic Overlays */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"
          style={{
            mixBlendMode: "multiply"
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${cursorPosition.x}% ${cursorPosition.y}%, rgba(147, 51, 234, 0.15) 0%, transparent 45%), radial-gradient(circle at ${100 - cursorPosition.x}% ${100 - cursorPosition.y}%, rgba(59, 130, 246, 0.15) 0%, transparent 45%)`,
            transition: "background 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
            mixBlendMode: "soft-light"
          }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Minimal Header */}
        <header className="fixed top-0 left-0 right-0 z-50">
          <nav className="container mx-auto px-6 h-20 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-2"
            >
              <Sparkles className="w-6 h-6 text-purple-400" />
              <span className="font-space text-lg font-medium tracking-[0.2em] text-white/90">AI IMAGE STUDIO</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Button
                variant="ghost"
                className="font-space text-sm tracking-wider text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                asChild
              >
                <Link href="/auth/signin">Sign in →</Link>
              </Button>
            </motion.div>
          </nav>
        </header>

        {/* Hero Content */}
        <main className="min-h-screen">
          <div className="container mx-auto px-6">
            <div className="min-h-screen flex items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="max-w-4xl pt-32 md:pt-20"
              >
                <div className="space-y-6">
                  <h1 className="font-space font-medium">
                    <span className="block text-[5rem] leading-[1.2] sm:text-[7rem] lg:text-[9rem] text-white/80">
                      Create
                    </span>
                    <div className="flex flex-col">
                      <span className="block text-[5rem] leading-[1.2] sm:text-[7rem] lg:text-[9rem] bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent pb-6">
                        Stunning AI
                      </span>
                    </div>
                    <span className="block text-[5rem] leading-[1.2] sm:text-[7rem] lg:text-[9rem] text-white/80 -mt-8">
                      Images
                    </span>
                  </h1>
                  <p className="font-space text-xl font-light text-white/60 max-w-xl tracking-wide leading-relaxed pl-2">
                    Transform your imagination into reality with our minimalist AI image generation platform.
                  </p>
                  <div className="pl-2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-block"
                    >
                      <Button
                        className="h-14 px-10 font-space text-sm tracking-[0.2em] bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-300 group"
                        asChild
                      >
                        <Link href="/auth/signup" className="flex items-center gap-3">
                          START CREATING
                          <span className="text-white/60 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Features Section - Minimal and Artistic */}
          <div className="container mx-auto px-6 pb-32 mt-32 sm:mt-48">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-screen-xl mx-auto"
            >
              {[
                { 
                  title: "Ideogram v3", 
                  description: "Create hyper-realistic images with unmatched detail and artistic flair",
                  gradient: "from-purple-400/20 to-blue-400/20"
                },
                { 
                  title: "Imagen 4", 
                  description: "Google's latest AI powerhouse for photorealistic masterpieces",
                  gradient: "from-blue-400/20 to-emerald-400/20"
                },
                { 
                  title: "Flux Pro Ultra", 
                  description: "Next-gen model for stunning artistic styles and perfect compositions",
                  gradient: "from-emerald-400/20 to-amber-400/20"
                },
                { 
                  title: "More Inside", 
                  description: "Explore our full collection of premium AI models and advanced features",
                  gradient: "from-amber-400/20 to-rose-400/20"
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  className={`relative group overflow-hidden border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 
                    transition-all duration-500 backdrop-blur-sm bg-gradient-to-br ${feature.gradient}`}
                >
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <h3 className="font-space text-lg font-medium tracking-wider mb-3 text-white/90 group-hover:text-white transition-colors">
                      {feature.title}
                    </h3>
                    <p className="font-space text-sm text-white/50 font-light tracking-wide group-hover:text-white/70 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                  {feature.title === "More Inside" ? (
                    <div className="absolute bottom-3 right-3">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400/30 to-blue-400/30 flex items-center justify-center"
                      >
                        <span className="text-white/70 text-lg">+</span>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-tl-full transform translate-x-16 translate-y-16 group-hover:translate-x-8 group-hover:translate-y-8 transition-transform duration-500" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 backdrop-blur-sm bg-black/20">
          <div className="container mx-auto px-6 py-4">
            <div className="text-center font-space text-sm text-white/40 font-light tracking-wider">
              <p>&copy; {new Date().getFullYear()} AI IMAGE STUDIO</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
