"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { AlertTriangle, Clock, Zap, X, Timer, Crown, Sparkles, TrendingUp, Gift } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface QuotaLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  quotaInfo?: {
    used: number
    limit: number
    period: "hourly" | "daily" | "monthly"
  }
}

export function QuotaLimitDialog({ 
  open, 
  onOpenChange, 
  title, 
  message, 
  quotaInfo 
}: QuotaLimitDialogProps) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  // Calculate time until quota resets
  const calculateTimeLeft = () => {
    if (!quotaInfo) {
      console.log('❌ No quotaInfo provided')
      return ""
    }

    // Validate and normalize the period
    let normalizedPeriod: "hourly" | "daily" | "monthly" = "hourly"
    if (quotaInfo.period === "daily" || quotaInfo.period === "monthly" || quotaInfo.period === "hourly") {
      normalizedPeriod = quotaInfo.period
    } else {
      console.log('⚠️ Invalid period, defaulting to hourly:', quotaInfo.period)
      normalizedPeriod = "hourly"
    }

    const now = new Date()
    let resetTime: Date

    console.log('🕐 Current time:', now.toString())
    console.log('📊 Quota period (normalized):', normalizedPeriod)

    switch (normalizedPeriod) {
      case "hourly":
        resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0)
        break
      case "daily":
        resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
        break
      case "monthly":
        resetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
        break
    }

    console.log('🎯 Reset time:', resetTime.toString())

    const difference = resetTime.getTime() - now.getTime()
    console.log('⏰ Time difference (ms):', difference)
    
    if (difference <= 0) {
      console.log('✅ Quota has reset!')
      return "Quota has reset!"
    }

    const hours = Math.floor(difference / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    console.log('🧮 Calculated time:', { hours, minutes, seconds })

    let result = ""
    if (normalizedPeriod === "hourly") {
      result = `${minutes}m ${seconds}s`
    } else if (normalizedPeriod === "daily") {
      result = `${hours}h ${minutes}m`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      result = days > 0 ? `${days}d ${remainingHours}h` : `${remainingHours}h ${minutes}m`
    }

    console.log('🎉 Final result:', result)
    return result
  }

  // Update countdown every second
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { open, quotaInfo: !!quotaInfo })
    
    if (!open || !quotaInfo) {
      console.log('❌ Early return from useEffect')
      return
    }

    // Initial calculation immediately
    const initialTimeLeft = calculateTimeLeft()
    console.log('⏰ Setting initial countdown:', initialTimeLeft)
    setTimeLeft(initialTimeLeft)

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      console.log('⏰ Countdown update:', newTimeLeft)
      setTimeLeft(newTimeLeft)
    }, 1000)

    return () => {
      console.log('🧹 Cleaning up timer')
      clearInterval(timer)
    }
  }, [open, quotaInfo?.period, quotaInfo?.used, quotaInfo?.limit])

  const getPeriodIcon = () => {
    const period = quotaInfo?.period
    if (period === "hourly" || period === "daily" || period === "monthly") {
      return <Clock className="w-5 h-5" />
    }
    return <Zap className="w-5 h-5" />
  }

  const getPeriodText = () => {
    const period = quotaInfo?.period
    if (period === "hourly") return "this hour"
    if (period === "daily") return "today"
    if (period === "monthly") return "this month"
    return "current period"
  }

  const getResetText = () => {
    const period = quotaInfo?.period
    if (period === "hourly") return "Next hour"
    if (period === "daily") return "Tomorrow"
    if (period === "monthly") return "Next month"
    return "Next period"
  }

  const getPeriodDisplayName = () => {
    const period = quotaInfo?.period
    if (period === "hourly") return "Hourly"
    if (period === "daily") return "Daily"
    if (period === "monthly") return "Monthly"
    return "Hourly" // Default fallback
  }

  const handleUpgrade = () => {
    // TODO: Add upgrade logic here
    window.open('/pricing', '_blank')
  }

  // Debug log
  console.log('🔍 QuotaLimitDialog render:', { open, quotaInfo, timeLeft })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg w-full mx-4 border-0 bg-gradient-to-br from-red-500 via-orange-500 to-pink-500 backdrop-blur-xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !m-0">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-75"></div>
          <div className="absolute top-40 left-20 w-60 h-60 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-150"></div>
        </div>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 text-white">
          <AlertDialogHeader className="space-y-6 text-center">
            {/* Animated warning icon */}
            <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-white/20 backdrop-blur-sm shadow-xl animate-bounce">
              <AlertTriangle className="w-10 h-10 text-white animate-pulse" />
            </div>
            
            <AlertDialogTitle className="text-center text-2xl font-bold text-white drop-shadow-lg">
              🚨 Generation Limit Reached!
            </AlertDialogTitle>
            
            <AlertDialogDescription className="text-center text-white/90 text-lg leading-relaxed">
              You've hit your generation limit! But don't worry - we've got you covered.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Quota Info Section */}
          <div className="space-y-6 mt-8">
            {quotaInfo && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {getPeriodIcon()}
                  <span className="font-bold text-xl text-white">
                    {getPeriodDisplayName()} Usage
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-white/80">Used {getPeriodText()}:</span>
                    <span className="font-bold text-yellow-200 text-xl">
                      {quotaInfo.used} / {quotaInfo.limit}
                    </span>
                  </div>
                  
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full transition-all duration-500 animate-pulse"
                      style={{ 
                        width: `${Math.min((quotaInfo.used / quotaInfo.limit) * 100, 100)}%` 
                      }}
                    />
                  </div>

                  {/* Countdown Timer */}
                  <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-300/30">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Timer className="w-5 h-5 text-blue-200 animate-spin" />
                      <span className="text-base font-medium text-blue-100">
                        Quota resets in:
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-blue-200 font-mono">
                        {timeLeft || (quotaInfo.period === "hourly" ? "< 1 hour" : quotaInfo.period === "daily" ? "< 1 day" : "< 1 month")}
                      </span>
                      <p className="text-sm text-blue-200 mt-1">
                        {getResetText()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Premium offer section */}
            <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-md rounded-2xl p-6 border border-yellow-300/30 shadow-xl">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-yellow-200 animate-bounce" />
                <span className="text-xl font-bold text-yellow-100">
                  Upgrade to Premium
                </span>
                <Sparkles className="w-6 h-6 text-yellow-200 animate-bounce delay-75" />
              </div>
              
              <div className="space-y-3 text-center">
                <p className="text-white/90 text-base">
                  ✨ <strong>Unlimited</strong> image generations
                </p>
                <p className="text-white/90 text-base">
                  🚀 <strong>Priority</strong> processing queue
                </p>
                <p className="text-white/90 text-base">
                  🎨 <strong>Advanced</strong> editing tools
                </p>
                <p className="text-white/90 text-base">
                  💎 <strong>Exclusive</strong> premium models
                </p>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-3 mt-8">
            <Button 
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-300 hover:via-orange-300 hover:to-red-300 text-white font-bold text-lg py-4 rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 border-2 border-white/30"
            >
              <Crown className="w-6 h-6 mr-2 animate-bounce" />
              Upgrade to Premium Now!
              <TrendingUp className="w-6 h-6 ml-2 animate-bounce delay-75" />
            </Button>
            
            <Button 
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 font-semibold py-3 rounded-xl backdrop-blur-sm transition-all duration-200"
            >
              I'll Wait
            </Button>
          </div>

          {/* Special offer badge */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-green-300/30">
              <Gift className="w-4 h-4 text-green-200 animate-pulse" />
              <span className="text-green-100 text-sm font-medium">
                🎉 Limited time: 50% off first month!
              </span>
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
} 