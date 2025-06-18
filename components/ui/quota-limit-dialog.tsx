"use client"

import * as React from "react"
import { AlertTriangle, Clock, Zap, X } from "lucide-react"
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
  const getPeriodIcon = () => {
    switch (quotaInfo?.period) {
      case "hourly": return <Clock className="w-5 h-5" />
      case "daily": return <Clock className="w-5 h-5" />
      case "monthly": return <Clock className="w-5 h-5" />
      default: return <Zap className="w-5 h-5" />
    }
  }

  const getPeriodText = () => {
    switch (quotaInfo?.period) {
      case "hourly": return "this hour"
      case "daily": return "today"
      case "monthly": return "this month"
      default: return "current period"
    }
  }

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
          
          <AlertDialogDescription className="text-center space-y-4">
            <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
              {message}
            </p>
            
            {quotaInfo && (
              <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-center gap-2 mb-3">
                  {getPeriodIcon()}
                  <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                    {quotaInfo.period} Limit
                  </span>
                </div>
                
                <div className="space-y-2">
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
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> Consider upgrading to Premium for unlimited generations!
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
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