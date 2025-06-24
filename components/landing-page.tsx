"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import { inter, spaceGrotesk } from "@/lib/fonts"
import { useTranslation } from "@/components/providers/locale-provider"
import { LanguageSwitcher } from "@/components/ui/language-switcher"

export function LandingPage() {
  const { t } = useTranslation()
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
        {/* Mobile-Optimized Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/20">
          <nav className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-2"
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              <span className="font-space text-sm sm:text-lg font-medium tracking-[0.1em] sm:tracking-[0.2em] text-white/90 hidden xs:block">
                {t('header.title')}
              </span>
              <span className="font-space text-sm font-medium tracking-[0.1em] text-white/90 xs:hidden">
                AI STUDIO
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center gap-2 sm:gap-4"
            >
                            <LanguageSwitcher
                variant="ghost"
                size="sm"
              />
              <Button
                variant="ghost"
                size="sm"
                className="font-space text-xs sm:text-sm tracking-wider text-white/80 hover:text-white hover:bg-white/10 transition-colors px-2 sm:px-4"
                asChild
              >
                <Link href="/auth/signin" className="hidden sm:inline">
                  {t('header.signIn')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="font-space text-xs tracking-wider text-white/80 hover:text-white hover:bg-white/10 transition-colors px-2 sm:hidden"
                asChild
              >
                <Link href="/auth/signin">→</Link>
              </Button>
            </motion.div>
          </nav>
        </header>

        {/* Mobile-Optimized Hero Content */}
        <main className="min-h-screen relative">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="min-h-screen flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="max-w-4xl pt-20 sm:pt-24 md:pt-20 text-center sm:text-left w-full"
              >
                <div className="space-y-6 sm:space-y-8">
                  <h1 className="font-space font-medium">
                    <span className="block text-[3rem] leading-[0.9] sm:text-[5rem] md:text-[7rem] lg:text-[9rem] sm:leading-[1.2] text-white/80 mb-2 sm:mb-0">
                      {t('landing.title.create')}
                    </span>
                    <div className="flex flex-col">
                      <span className="block text-[3rem] leading-[0.9] sm:text-[5rem] md:text-[7rem] lg:text-[9rem] sm:leading-[1.2] bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent pb-2 sm:pb-6 animate-gradient-x bg-[length:200%_100%]">
                        {t('landing.title.stunningAI')}
                      </span>
                    </div>
                    <span className="block text-[3rem] leading-[0.9] sm:text-[5rem] md:text-[7rem] lg:text-[9rem] sm:leading-[1.2] text-white/80 -mt-2 sm:-mt-8">
                      {t('landing.title.images')}
                    </span>
                  </h1>
                  
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="font-space text-base sm:text-xl font-light text-white/70 max-w-2xl tracking-wide leading-relaxed mx-auto sm:mx-0 sm:pl-2 px-4 sm:px-0"
                  >
                    {t('landing.subtitle')}
                  </motion.p>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-4 sm:pl-2 px-4 sm:px-0"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(147, 51, 234, 0)",
                          "0 0 30px 5px rgba(147, 51, 234, 0.2)",
                          "0 0 0 0 rgba(147, 51, 234, 0)"
                        ]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Button
                        size="lg"
                        className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 font-space text-sm sm:text-base tracking-[0.1em] sm:tracking-[0.2em] relative overflow-hidden
                          bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-[length:200%_100%]
                          text-white border-none shadow-2xl
                          animate-gradient-x hover:shadow-purple-500/30 hover:animate-none
                          hover:from-purple-600 hover:via-pink-600 hover:to-blue-600
                          transition-all duration-300 group rounded-xl"
                        asChild
                      >
                        <Link href="/auth/signup" className="flex items-center justify-center gap-3">
                          {t('landing.cta')}
                          <motion.span 
                            className="text-white/90"
                            animate={{ x: [0, 5, 0] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            →
                          </motion.span>
                        </Link>
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 font-space text-sm sm:text-base tracking-[0.1em] border-white/20 bg-white/5 backdrop-blur-sm text-white/90 hover:bg-white/10 hover:border-white/30 transition-all duration-300 rounded-xl"
                        asChild
                      >
                        <Link href="/gallery" className="flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          {t('landing.viewGallery')}
                        </Link>
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Mobile-Optimized Features Section */}
          <div className="container mx-auto px-4 sm:px-6 pb-20 sm:pb-32 mt-16 sm:mt-32 md:mt-48">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="font-space text-2xl sm:text-3xl md:text-4xl font-medium text-white/90 mb-4">
                {t('landing.featuresTitle')}
              </h2>
              <p className="font-space text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
                {t('landing.featuresSubtitle')}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
            >
              {[
                { 
                  title: t('landing.features.ideogram.title'),
                  description: t('landing.features.ideogram.description'),
                  gradient: "from-purple-400/20 to-blue-400/20"
                },
                { 
                  title: t('landing.features.imagen.title'),
                  description: t('landing.features.imagen.description'),
                  gradient: "from-blue-400/20 to-emerald-400/20"
                },
                { 
                  title: t('landing.features.flux.title'),
                  description: t('landing.features.flux.description'),
                  gradient: "from-emerald-400/20 to-amber-400/20"
                },
                { 
                  title: t('landing.features.more.title'),
                  description: t('landing.features.more.description'),
                  gradient: "from-amber-400/20 to-rose-400/20"
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={{ 
                    scale: 1.03,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative group overflow-hidden border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 hover:border-purple-500/40 
                    transition-all duration-500 backdrop-blur-md bg-gradient-to-br ${feature.gradient} cursor-pointer
                    shadow-lg hover:shadow-2xl hover:shadow-purple-500/10`}
                >
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <h3 className="font-space text-base sm:text-lg font-semibold tracking-wide text-white/90 group-hover:text-white transition-colors">
                        {feature.title}
                      </h3>
                      {feature.title === t('landing.features.more.title') ? (
                        <motion.div
                          animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 180, 360]
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-400/40 to-blue-400/40 flex items-center justify-center border border-white/20"
                        >
                          <span className="text-white/80 text-sm sm:text-base font-bold">+</span>
                        </motion.div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                      )}
                    </div>
                    <p className="font-space text-xs sm:text-sm text-white/60 font-light tracking-wide leading-relaxed group-hover:text-white/80 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Subtle decoration */}
                  <div className="absolute bottom-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-white/3 to-transparent rounded-tl-full transform translate-x-10 sm:translate-x-16 translate-y-10 sm:translate-y-16 group-hover:translate-x-5 sm:group-hover:translate-x-8 group-hover:translate-y-5 sm:group-hover:translate-y-8 transition-transform duration-700" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </main>

        {/* Mobile-Optimized Footer */}
        <footer className="relative mt-16 sm:mt-24 backdrop-blur-md bg-black/30 border-t border-white/10">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="font-space text-sm font-medium tracking-[0.1em] text-white/80">
                  AI IMAGE STUDIO
                </span>
              </div>
              
              <div className="text-center sm:text-right">
                <p className="font-space text-xs sm:text-sm text-white/50 font-light tracking-wide">
                  {t('landing.footer', { year: new Date().getFullYear() })}
                </p>
              </div>
            </div>
            
            {/* Mobile CTA Section */}
            <div className="mt-6 pt-6 border-t border-white/5 text-center sm:hidden">
              <p className="font-space text-sm text-white/60 mb-4">
                {t('landing.mobileReady')}
              </p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-xl font-space text-xs tracking-wide"
                asChild
              >
                <Link href="/auth/signup">{t('landing.getStarted')}</Link>
              </Button>
                         </div>
           </div>
         </footer>
         
         {/* Mobile Floating Action Button */}
         <motion.div
           initial={{ opacity: 0, scale: 0 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 2, duration: 0.5 }}
           className="fixed bottom-6 right-4 z-50 sm:hidden"
         >
           <motion.div
             animate={{ 
               boxShadow: [
                 "0 0 0 0 rgba(147, 51, 234, 0.7)",
                 "0 0 0 10px rgba(147, 51, 234, 0)",
                 "0 0 0 0 rgba(147, 51, 234, 0.7)"
               ]
             }}
             transition={{
               duration: 2,
               repeat: Infinity,
               ease: "easeInOut"
             }}
             whileTap={{ scale: 0.95 }}
           >
             <Button
               size="lg"
               className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 shadow-2xl hover:shadow-purple-500/25 border-2 border-white/20"
               asChild
             >
               <Link href="/auth/signup" className="flex items-center justify-center">
                 <Sparkles className="w-6 h-6 text-white" />
               </Link>
             </Button>
           </motion.div>
         </motion.div>
      </div>
    </div>
  )
}
