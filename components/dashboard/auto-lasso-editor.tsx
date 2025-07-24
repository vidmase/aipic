"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, Eye, EyeOff, MousePointer, Square, RotateCcw, Zap, Target } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface DetectedObject {
  id: string
  bbox: number[]
  confidence: number
  label: string
  mask_url?: string
  center: { x: number, y: number }
}

interface AutoLassoRegion {
  id: string
  mask_url: string
  bbox: number[]
  confidence: number
  label: string
  selected: boolean
  refined: boolean
}

interface AutoLassoEditorProps {
  initialImage?: string
  onImageGenerated?: (imageUrl: string) => void
}

export function AutoLassoEditor({ initialImage, onImageGenerated }: AutoLassoEditorProps) {
  const [image, setImage] = useState<string>(initialImage || '')
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [autoLassoRegions, setAutoLassoRegions] = useState<AutoLassoRegion[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState<string>('')
  const [editPrompt, setEditPrompt] = useState<string>('')
  const [guidanceScale, setGuidanceScale] = useState<number[]>([7.5])
  
  const [isDetecting, setIsDetecting] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showMasks, setShowMasks] = useState(true)
  const [autoLassoMode, setAutoLassoMode] = useState<'click' | 'drag' | 'semantic'>('click')
  
  const [, setUserSelection] = useState<{x: number, y: number} | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragArea, setDragArea] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null)

  // const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImage(result)
        // Clear previous data
        setDetectedObjects([])
        setAutoLassoRegions([])
        setSelectedRegionId('')
        setUserSelection(null)
        setDragArea(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // Get click coordinates relative to the image
  const getImageCoordinates = (event: React.MouseEvent): {x: number, y: number} | null => {
    if (!imageRef.current || !containerRef.current) return null

    const rect = imageRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert to image coordinates
    const imageX = (x / rect.width) * imageRef.current.naturalWidth
    const imageY = (y / rect.height) * imageRef.current.naturalHeight
    
    return { x: imageX, y: imageY }
  }

  // Auto-detect objects using SAM2 auto-segment
  const performAutoDetection = async () => {
    if (!image) return
    
    setIsDetecting(true)
    try {
      const response = await fetch('/api/sam2-segment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: image,
          auto_segment: true
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to detect objects")
      }

      if (data.individual_masks && data.individual_masks.length > 0) {
        const objects: DetectedObject[] = data.individual_masks.map((mask: any, index: number) => {
          // Handle both URL string format and object format
          const maskUrl = typeof mask === 'string' ? mask : (mask.url || mask.mask_url)
          
          return {
            id: mask.id || `obj_${index}`,
            bbox: Array.isArray(mask.bbox) ? mask.bbox : [0, 0, 100, 100], // Will be updated when mask loads
            confidence: typeof mask.confidence === 'number' ? mask.confidence : 0.8,
            label: typeof mask.label === 'string' ? mask.label : `Object ${index + 1}`,
            mask_url: maskUrl,
            center: {
              x: 50, // Will be updated when mask loads
              y: 50
            }
          }
        })
        
        setDetectedObjects(objects)
        
        toast({
          title: "Objects Detected",
          description: `Found ${objects.length} objects in the image`,
        })
      } else {
        toast({
          title: "No Objects Found",
          description: "Try adjusting the detection sensitivity or use manual selection",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Auto detection error:', error)
      toast({
        title: "Detection Failed",
        description: error instanceof Error ? error.message : "Failed to detect objects",
        variant: "destructive",
      })
    } finally {
      setIsDetecting(false)
    }
  }

  // Smart object selection based on user input
  const handleSmartSelection = async (event: React.MouseEvent) => {
    if (autoLassoMode === 'click') {
      const coords = getImageCoordinates(event)
      if (!coords) return
      
      setUserSelection(coords)
      
      // Find closest detected object or trigger new detection
      if (detectedObjects.length === 0) {
        await performAutoDetection()
      } else {
        selectClosestObject(coords)
      }
    }
  }

  // Select the closest object to user's click
  const selectClosestObject = (coords: {x: number, y: number}) => {
    let closestObject = null
    let minDistance = Infinity
    
    detectedObjects.forEach(obj => {
      const distance = Math.sqrt(
        Math.pow(obj.center.x - coords.x, 2) + 
        Math.pow(obj.center.y - coords.y, 2)
      )
      
      if (distance < minDistance) {
        minDistance = distance
        closestObject = obj
      }
    })
    
    if (closestObject) {
      // Convert to auto lasso region and refine
      refineObjectSelection(closestObject, coords)
    }
  }

  // Refine object selection using SAM2 interactive prompts
  const refineObjectSelection = async (object: DetectedObject, userPoint: {x: number, y: number}) => {
    setIsRefining(true)
    try {
      const response = await fetch('/api/sam2-segment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: image,
          points: [[userPoint.x, userPoint.y]],
          point_labels: [1], // Positive point
          boxes: [object.bbox],
          multimask_output: true
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to refine selection")
      }

      if (data.individual_masks && data.individual_masks.length > 0) {
        const refinedMask = data.individual_masks[0] // Use best mask
        
        const newRegion: AutoLassoRegion = {
          id: `region_${Date.now()}`,
          mask_url: refinedMask.mask_url,
          bbox: refinedMask.bbox || object.bbox,
          confidence: refinedMask.confidence || object.confidence,
          label: object.label,
          selected: true,
          refined: true
        }
        
        setAutoLassoRegions(prev => [...prev.filter(r => !r.selected), newRegion])
        setSelectedRegionId(newRegion.id)
        
        toast({
          title: "Selection Refined",
          description: "Object boundaries have been automatically refined",
        })
      }
    } catch (error) {
      console.error('Refinement error:', error)
      toast({
        title: "Refinement Failed",
        description: error instanceof Error ? error.message : "Failed to refine selection",
        variant: "destructive",
      })
    } finally {
      setIsRefining(false)
    }
  }

  // Perform semantic object detection for better understanding
  const performSemanticDetection = async (prompt: string) => {
    if (!image || !prompt.trim()) return
    
    setIsDetecting(true)
    try {
      const response = await fetch('/api/detect-objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: image,
          detection_prompt: prompt
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to detect semantic objects")
      }

      // Process semantic detection results
      if (data.detections && data.detections.length > 0) {
        const semanticObjects: DetectedObject[] = data.detections.map((det: any, index: number) => ({
          id: `semantic_${index}`,
          bbox: det.bbox,
          confidence: det.confidence,
          label: det.label || prompt,
          center: {
            x: (det.bbox[0] + det.bbox[2]) / 2,
            y: (det.bbox[1] + det.bbox[3]) / 2
          }
        }))
        
        setDetectedObjects(prev => [...prev, ...semanticObjects])
        
        toast({
          title: "Semantic Objects Found",
          description: `Found ${semanticObjects.length} instances of "${prompt}"`,
        })
      }
    } catch (error) {
      console.error('Semantic detection error:', error)
      toast({
        title: "Semantic Detection Failed",
        description: error instanceof Error ? error.message : "Failed to detect semantic objects",
        variant: "destructive",
      })
    } finally {
      setIsDetecting(false)
    }
  }

  // Handle drag selection for area-based auto lasso
  const handleMouseDown = (event: React.MouseEvent) => {
    if (autoLassoMode !== 'drag') return
    
    const coords = getImageCoordinates(event)
    if (!coords) return

    setIsDragging(true)
    setDragArea({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y })
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !dragArea) return
    
    const coords = getImageCoordinates(event)
    if (!coords) return

    setDragArea(prev => prev ? {
      ...prev,
      x2: coords.x,
      y2: coords.y
    } : null)
  }

  const handleMouseUp = async () => {
    if (!isDragging || !dragArea) return
    
    setIsDragging(false)
    
    // Use drag area for object detection
    const width = Math.abs(dragArea.x2 - dragArea.x1)
    const height = Math.abs(dragArea.y2 - dragArea.y1)
    
    if (width > 20 && height > 20) {
      await performAreaBasedDetection(dragArea)
    }
  }

  // Perform area-based object detection
  const performAreaBasedDetection = async (area: {x1: number, y1: number, x2: number, y2: number}) => {
    setIsDetecting(true)
    try {
      const bbox = [
        Math.min(area.x1, area.x2),
        Math.min(area.y1, area.y2),
        Math.max(area.x1, area.x2),
        Math.max(area.y1, area.y2)
      ]
      
      const response = await fetch('/api/sam2-segment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: image,
          boxes: [bbox],
          multimask_output: true
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to detect objects in area")
      }

      if (data.individual_masks && data.individual_masks.length > 0) {
        const bestMask = data.individual_masks[0]
        
        const newRegion: AutoLassoRegion = {
          id: `area_${Date.now()}`,
          mask_url: bestMask.mask_url,
          bbox: bestMask.bbox || bbox,
          confidence: bestMask.confidence || 0.9,
          label: "Selected Area",
          selected: true,
          refined: true
        }
        
        setAutoLassoRegions(prev => [...prev.filter(r => !r.selected), newRegion])
        setSelectedRegionId(newRegion.id)
      }
    } catch (error) {
      console.error('Area detection error:', error)
      toast({
        title: "Area Detection Failed",
        description: error instanceof Error ? error.message : "Failed to detect objects in selected area",
        variant: "destructive",
      })
    } finally {
      setIsDetecting(false)
      setDragArea(null)
    }
  }

  // Apply editing operation to selected region
  const handleObjectEdit = async () => {
    const selectedRegion = autoLassoRegions.find(r => r.id === selectedRegionId)
    if (!selectedRegion || !editPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please select a region and enter an edit prompt",
        variant: "destructive",
      })
      return
    }

    setIsEditing(true)
    try {
      const response = await fetch('/api/kontext-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editPrompt,
          image_url: image,
          mask_url: selectedRegion.mask_url,
          guidance_scale: guidanceScale[0],
          num_inference_steps: 28,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to edit object")
      }

      if (data.image && data.image.image_url) {
        onImageGenerated?.(data.image.image_url)
        
        toast({
          title: "Success!",
          description: "Object edited successfully with auto lasso selection",
        })
      }
    } catch (error) {
      console.error('Edit error:', error)
      toast({
        title: "Edit Failed",
        description: error instanceof Error ? error.message : "Failed to edit object",
        variant: "destructive",
      })
    } finally {
      setIsEditing(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Auto Lasso Editor
          <Badge variant="secondary">AI-Powered</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="image-upload">Upload Image</Label>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>

        {/* Auto Lasso Mode Selection */}
        <div className="space-y-2">
          <Label>Auto Lasso Mode</Label>
          <div className="flex gap-2">
            <Button
              variant={autoLassoMode === 'click' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoLassoMode('click')}
            >
              <MousePointer className="h-4 w-4 mr-1" />
              Smart Click
            </Button>
            <Button
              variant={autoLassoMode === 'drag' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoLassoMode('drag')}
            >
              <Square className="h-4 w-4 mr-1" />
              Drag Area
            </Button>
            <Button
              variant={autoLassoMode === 'semantic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoLassoMode('semantic')}
            >
              <Target className="h-4 w-4 mr-1" />
              Semantic
            </Button>
          </div>
        </div>

        {/* Image Display and Interaction */}
        {image && (
          <div className="space-y-4">
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden bg-gray-50 cursor-crosshair"
              onClick={autoLassoMode === 'click' ? handleSmartSelection : undefined}
              onMouseDown={autoLassoMode === 'drag' ? handleMouseDown : undefined}
              onMouseMove={autoLassoMode === 'drag' ? handleMouseMove : undefined}
              onMouseUp={autoLassoMode === 'drag' ? handleMouseUp : undefined}
            >
              <Image
                ref={imageRef}
                src={image}
                alt="Editor"
                width={800}
                height={600}
                className="w-full h-auto max-h-96 object-contain"
                unoptimized
              />
              
              {/* Overlay for detected objects - show actual mask images */}
              {showMasks && detectedObjects.length > 0 && (
                <div className="absolute inset-0">
                  {detectedObjects.map((obj, index) => (
                    <div 
                      key={obj.id} 
                      className="absolute inset-0 cursor-pointer hover:opacity-60 transition-opacity pointer-events-auto"
                      onClick={() => {
                        // Convert object to auto lasso region
                        refineObjectSelection(obj, obj.center)
                      }}
                    >
                      {obj.mask_url && (
                        <>
                          <Image
                            src={obj.mask_url}
                            alt={`Mask for ${obj.label}`}
                            width={800}
                            height={600}
                            className="w-full h-full object-contain opacity-40 pointer-events-none"
                            style={{
                              mixBlendMode: 'multiply',
                              filter: `hue-rotate(${index * 60}deg) saturate(1.5)`
                            }}
                            unoptimized
                          />
                          <div 
                            className="absolute top-2 left-2 text-xs bg-blue-500 text-white px-2 py-1 rounded shadow-lg pointer-events-none"
                            style={{ zIndex: 10 }}
                          >
                            {obj.label} ({Math.round(obj.confidence * 100)}%)
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Drag area overlay */}
              {isDragging && dragArea && (
                <div
                  className="absolute border-2 border-green-400 bg-green-400/20"
                  style={{
                    left: `${imageRef.current ? (Math.min(dragArea.x1, dragArea.x2) / imageRef.current.naturalWidth * 100) : 0}%`,
                    top: `${imageRef.current ? (Math.min(dragArea.y1, dragArea.y2) / imageRef.current.naturalHeight * 100) : 0}%`,
                    width: `${imageRef.current ? (Math.abs(dragArea.x2 - dragArea.x1) / imageRef.current.naturalWidth * 100) : 0}%`,
                    height: `${imageRef.current ? (Math.abs(dragArea.y2 - dragArea.y1) / imageRef.current.naturalHeight * 100) : 0}%`,
                  }}
                />
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={performAutoDetection}
                disabled={isDetecting}
                size="sm"
              >
                {isDetecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-1" />
                )}
                Auto Detect
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowMasks(!showMasks)}
                size="sm"
              >
                {showMasks ? (
                  <EyeOff className="h-4 w-4 mr-1" />
                ) : (
                  <Eye className="h-4 w-4 mr-1" />
                )}
                {showMasks ? 'Hide' : 'Show'} Masks
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setDetectedObjects([])
                  setAutoLassoRegions([])
                  setSelectedRegionId('')
                  setUserSelection(null)
                }}
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        )}

        {/* Semantic Detection Input */}
        {autoLassoMode === 'semantic' && (
          <div className="space-y-2">
            <Label htmlFor="semantic-prompt">What to detect?</Label>
            <div className="flex gap-2">
              <Input
                id="semantic-prompt"
                placeholder="e.g., person, car, building..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    performSemanticDetection(e.currentTarget.value)
                  }
                }}
              />
              <Button
                onClick={() => {
                  const input = document.getElementById('semantic-prompt') as HTMLInputElement
                  if (input?.value) {
                    performSemanticDetection(input.value)
                  }
                }}
                disabled={isDetecting}
              >
                Detect
              </Button>
            </div>
          </div>
        )}

        {/* Detected Objects List */}
        {detectedObjects.length > 0 && (
          <div className="space-y-2">
            <Label>Detected Objects ({detectedObjects.length})</Label>
            <div className="text-xs text-muted-foreground mb-2">
              Click on an object in the image or in the list below to select it for editing
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {detectedObjects.map((obj, index) => (
                <Button
                  key={obj.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto p-2 hover:bg-blue-50"
                  onClick={() => {
                    // Convert object to auto lasso region
                    refineObjectSelection(obj, obj.center)
                  }}
                >
                  <div className="truncate">
                    <div className="font-medium truncate flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded border"
                        style={{
                          backgroundColor: `hsl(${index * 60}, 70%, 60%)`,
                        }}
                      />
                      {obj.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(obj.confidence * 100)}% confidence
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Regions */}
        {autoLassoRegions.length > 0 && (
          <div className="space-y-2">
            <Label>Auto Lasso Selections</Label>
            <div className="space-y-2">
              {autoLassoRegions.map(region => (
                <div
                  key={region.id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    region.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedRegionId(region.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{region.label}</span>
                      {region.refined && (
                        <Badge variant="secondary" className="ml-2">
                          AI Refined
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(region.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Controls */}
        {selectedRegionId && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium">Edit Selected Object</h3>
            
            <div className="space-y-2">
              <Label htmlFor="edit-prompt">Edit Prompt</Label>
              <Input
                id="edit-prompt"
                placeholder="Describe how to modify the selected object..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Guidance Scale: {guidanceScale[0]}</Label>
              <Slider
                value={guidanceScale}
                onValueChange={setGuidanceScale}
                max={20}
                min={1}
                step={0.5}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleObjectEdit}
              disabled={isEditing || !editPrompt.trim()}
              className="w-full"
            >
              {isEditing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Apply Auto Lasso Edit
            </Button>
          </div>
        )}

        {/* Status Indicators */}
        {(isDetecting || isRefining || isEditing) && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {isDetecting && "Detecting objects with AI..."}
              {isRefining && "Refining selection boundaries..."}
              {isEditing && "Applying auto lasso edit..."}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 