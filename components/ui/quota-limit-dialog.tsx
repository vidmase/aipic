"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { AlertTriangle, Clock, Zap, X, Timer } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

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
  }, [open, quotaInfo?.period, quotaInfo?.used, quotaInfo?.limit]) // Added more specific dependencies

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

  // Debug log
  console.log('🔍 QuotaLimitDialog render:', { open, quotaInfo, timeLeft })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md border-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-950/50 dark:via-orange-950/50 dark:to-yellow-950/50 backdrop-blur-xl shadow-2xl">
        <AlertDialogHeader className="space-y-4">
          {/* Header with gradient background */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 shadow-lg">
            <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
          </div>
          
          <AlertDialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">
            {title}
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-center">
            <span className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
              {message}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Quota Info Section - Outside of AlertDialogDescription to avoid nesting issues */}
        <div className="space-y-4 px-6">
          {quotaInfo && (
            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-center gap-2 mb-3">
                {getPeriodIcon()}
                <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                  {getPeriodDisplayName()} Limit
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Used {getPeriodText()}:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {quotaInfo.used} / {quotaInfo.limit}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((quotaInfo.used / quotaInfo.limit) * 100, 100)}%` 
                    }}
                  />
                </div>

                {/* Countdown Timer - Always show when quotaInfo exists */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Quota resets in:
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {timeLeft || (quotaInfo.period === "hourly" ? "< 1 hour" : quotaInfo.period === "daily" ? "< 1 day" : "< 1 month")}
                    </span>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {getResetText()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Consider upgrading to Premium for unlimited generations!
            </p>
          </div>
        </div>
        
        <div className="flex justify-center pt-2">
          <AlertDialogAction 
            onClick={() => onOpenChange(false)}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-2 rounded-full font-semibold"
          >
            Got it
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
} 