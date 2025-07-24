'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, Eye, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface DetectedObject {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  confidence?: number
  mask_url?: string
  bbox?: number[]
}

interface ObjectDetectionPanelProps {
  imageUrl?: string
  onObjectSelect?: (object: DetectedObject, index: number) => void
  onObjectEdit?: (object: DetectedObject, index: number) => void
  onObjectDelete?: (object: DetectedObject, index: number) => void
}

export function ObjectDetectionPanel({ 
  imageUrl, 
  onObjectSelect, 
  onObjectEdit, 
  onObjectDelete 
}: ObjectDetectionPanelProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [selectedObjectIndex, setSelectedObjectIndex] = useState<number | null>(null)
  const [showMasks, setShowMasks] = useState(true)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const detectObjects = async () => {
    if (!imageUrl) {
      toast.error('Please provide an image URL first')
      return
    }

    setIsDetecting(true)
    try {
      console.log('Starting SAM2 auto-segmentation with image URL:', imageUrl)
      
      // Use SAM2 auto-segment instead of Florence-2 for better visual feedback
      const response = await fetch('/api/sam2-segment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl
        })
      })

      console.log('SAM2 API response status:', response.status)
      console.log('SAM2 API response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('SAM2 API error data:', errorData)
        throw new Error(errorData.error || 'Object detection failed')
      }

      const data = await response.json()
      console.log('SAM2 API success data:', data)
      
      if (data.individual_masks && Array.isArray(data.individual_masks)) {
        console.log('Processing individual masks:', data.individual_masks.length)
        console.log('First mask sample:', data.individual_masks[0])
        
        // Convert SAM2 masks to our DetectedObject format
        const objects: DetectedObject[] = data.individual_masks.map((mask: any, index: number) => {
          // Handle different possible mask URL formats from fal.ai
          let maskUrl = null
          if (typeof mask === 'string') {
            maskUrl = mask
          } else if (mask.url) {
            maskUrl = mask.url
          } else if (mask.mask_url) {
            maskUrl = mask.mask_url
          }
          
          console.log(`Mask ${index}:`, {
            maskType: typeof mask,
            hasUrl: !!mask.url,
            hasMaskUrl: !!mask.mask_url,
            extractedUrl: maskUrl,
            maskKeys: typeof mask === 'object' ? Object.keys(mask) : 'not object'
          })
          
          const detectedObject = {
            id: mask.id || `obj_${index}`,
            x: mask.bbox?.[0] || index * 50,
            y: mask.bbox?.[1] || index * 50,
            w: mask.bbox?.[2] || 100,
            h: mask.bbox?.[3] || 100,
            label: mask.label || `Object ${index + 1}`,
            confidence: mask.confidence || 0.8,
            mask_url: maskUrl,
            bbox: mask.bbox
          }
          
          console.log(`Created object ${index}:`, detectedObject)
          return detectedObject
        })
        
        console.log('Final objects array:', objects)
        console.log('Objects with valid mask URLs:', objects.filter(obj => obj.mask_url).length)
        
        setDetectedObjects(objects)
        toast.success(`Detected ${objects.length} objects with precise masks`)
      } else {
        console.log('No individual_masks found in response:', data)
        toast.error('No objects detected in the image')
      }
    } catch (error) {
      console.error('Object detection error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to detect objects')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleObjectSelect = (object: DetectedObject, index: number) => {
    setSelectedObjectIndex(index)
    onObjectSelect?.(object, index)
  }

  const handleObjectEdit = (object: DetectedObject, index: number) => {
    setSelectedObjectIndex(index)
    onObjectEdit?.(object, index)
  }

  const handleObjectDelete = (object: DetectedObject, index: number) => {
    // Remove from local state
    const updatedObjects = detectedObjects.filter((_, i) => i !== index)
    setDetectedObjects(updatedObjects)
    
    // Reset selection if deleted object was selected
    if (selectedObjectIndex === index) {
      setSelectedObjectIndex(null)
    }
    
    onObjectDelete?.(object, index)
    toast.success(`${object.label} removed from list`)
  }

  // Handle clicking on mask overlay
  const handleMaskClick = (object: DetectedObject, index: number, event: React.MouseEvent) => {
    event.stopPropagation()
    handleObjectSelect(object, index)
    toast.success(`Selected ${object.label}`)
  }

  const formatBoundingBox = (object: DetectedObject) => {
    const width = Math.round(object.w)
    const height = Math.round(object.h)
    return `${width}×${height} at (${Math.round(object.x)}, ${Math.round(object.y)})`
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-500'
    if (confidence > 0.8) return 'bg-green-500'
    if (confidence > 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Object Detection with Masks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={detectObjects} 
            disabled={isDetecting || !imageUrl}
            className="flex-1"
          >
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting Objects...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Detect Objects
              </>
            )}
          </Button>
          
          {detectedObjects.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowMasks(!showMasks)}
              className="px-3"
            >
              {showMasks ? 'Hide' : 'Show'} Masks
            </Button>
          )}
        </div>

        {/* Image with mask overlays */}
        {imageUrl && (
          <div 
            ref={containerRef}
            className="relative border rounded-lg overflow-hidden bg-gray-50"
          >
            <Image
              ref={imageRef}
              src={imageUrl}
              alt="Image for object detection"
              width={800}
              height={600}
              className="w-full h-auto max-h-96 object-contain"
              unoptimized
            />
            
            {/* Mask overlays */}
            {showMasks && detectedObjects.length > 0 && (
              <div className="absolute inset-0">
                {detectedObjects.map((obj, index) => {
                  console.log(`Rendering mask overlay ${index}:`, {
                    id: obj.id,
                    label: obj.label,
                    hasMaskUrl: !!obj.mask_url,
                    maskUrl: obj.mask_url?.substring(0, 50) + '...',
                    showMasks,
                    selectedIndex: selectedObjectIndex
                  })
                  
                  return (
                    <div 
                      key={obj.id} 
                      className={`absolute inset-0 cursor-pointer hover:opacity-80 transition-opacity ${
                        selectedObjectIndex === index ? 'ring-2 ring-blue-500 ring-inset' : ''
                      }`}
                      onClick={(e) => handleMaskClick(obj, index, e)}
                      style={{ zIndex: index + 1 }}
                    >
                      {obj.mask_url ? (
                        <>
                          <Image
                            src={obj.mask_url}
                            alt={`Mask for ${obj.label}`}
                            width={800}
                            height={600}
                            className="w-full h-full object-contain pointer-events-none"
                            style={{
                              mixBlendMode: 'screen',
                              filter: `hue-rotate(${index * 60}deg) saturate(2) brightness(1.2)`,
                              opacity: 0.7
                            }}
                            unoptimized
                            onLoad={() => console.log(`Mask image loaded for ${obj.label}`)}
                            onError={(e) => console.error(`Failed to load mask for ${obj.label}:`, e)}
                          />
                          <div 
                            className={`absolute top-2 left-2 text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10 ${
                              selectedObjectIndex === index 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-black/70 text-white'
                            }`}
                          >
                            {obj.label} ({Math.round((obj.confidence || 0) * 100)}%)
                          </div>
                        </>
                      ) : (
                        <div 
                          className="absolute inset-0 border-2 border-dashed border-red-500 bg-red-100/20 flex items-center justify-center"
                          style={{ zIndex: 10 }}
                        >
                          <span className="text-red-600 text-xs bg-white px-2 py-1 rounded">
                            No mask URL for {obj.label}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {detectedObjects.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Detected Objects ({detectedObjects.length})
            </h3>
            <div className="text-xs text-muted-foreground mb-2">
              Click on an object mask in the image above or select from the list below
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {detectedObjects.map((object, index) => (
                <Card 
                  key={object.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedObjectIndex === index 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleObjectSelect(object, index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-3 h-3 rounded border"
                          style={{
                            backgroundColor: `hsl(${index * 60}, 70%, 60%)`,
                          }}
                        />
                        <Badge variant="outline" className="text-xs">
                          {object.label}
                        </Badge>
                        {object.confidence && (
                          <Badge 
                            className={`text-xs text-white ${getConfidenceColor(object.confidence)}`}
                          >
                            {Math.round(object.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {formatBoundingBox(object)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleObjectSelect(object, index)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleObjectEdit(object, index)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleObjectDelete(object, index)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {detectedObjects.length === 0 && !isDetecting && (
          <div className="text-center py-8 text-gray-500">
            <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm">No objects detected yet</p>
            <p className="text-xs text-gray-400">
              Upload an image and click "Detect Objects" to get started
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 