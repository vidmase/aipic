"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, Download, Eye, EyeOff, MousePointer, Square, RotateCcw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface SegmentedRegion {
  id: string
  mask: {
    mask_url?: string
    bbox?: number[]
    area?: number
    confidence?: number
  }
  points: Array<{x: number, y: number, positive: boolean}>
  boxes: Array<{x1: number, y1: number, x2: number, y2: number}>
  visible: boolean
  name: string
}

interface SmartObjectEditorProps {
  initialImage?: string
  onImageGenerated?: (imageUrl: string) => void
}

export function SmartObjectEditor({ initialImage, onImageGenerated }: SmartObjectEditorProps) {
  const [image, setImage] = useState<string>(initialImage || '')
  const [selectedRegions, setSelectedRegions] = useState<SegmentedRegion[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState<string>('')
  const [editPrompt, setEditPrompt] = useState<string>('')
  const [guidanceScale, setGuidanceScale] = useState<number[]>([7.5])
  
  const [selectionMode, setSelectionMode] = useState<'point' | 'box'>('point')
  const [isSegmenting, setIsSegmenting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showMasks, setShowMasks] = useState(true)
  
  const [currentPoints, setCurrentPoints] = useState<Array<{x: number, y: number, positive: boolean}>>([])
  const [isDrawingBox, setIsDrawingBox] = useState(false)
  const [boxStart, setBoxStart] = useState<{x: number, y: number} | null>(null)
  const [currentBox, setCurrentBox] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
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
        // Clear previous selections
        setSelectedRegions([])
        setSelectedRegionId('')
        setCurrentPoints([])
        setCurrentBox(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // Get click coordinates relative to the image
  const getImageCoordinates = (event: React.MouseEvent): {x: number, y: number} | null => {
    if (!imageRef.current || !containerRef.current) return null

    const rect = imageRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert to image coordinates
    const imageX = (x / rect.width) * imageRef.current.naturalWidth
    const imageY = (y / rect.height) * imageRef.current.naturalHeight
    
    return { x: imageX, y: imageY }
  }

  // Handle canvas clicks for point selection
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (selectionMode !== 'point') return
    
    const coords = getImageCoordinates(event)
    if (!coords) return

    // Right click for negative points, left click for positive
    const isPositive = event.button !== 2
    
    const newPoint = { x: coords.x, y: coords.y, positive: isPositive }
    const updatedPoints = [...currentPoints, newPoint]
    setCurrentPoints(updatedPoints)
    
    // Prevent segmentation call if no points
    if (updatedPoints.length === 0) {
      toast({
        title: "Selection Not Found",
        description: "Please select at least one point before segmenting.",
        variant: "destructive",
      })
      return
    }
    // Trigger segmentation with current points
    performSegmentation(updatedPoints, [])
  }

  // Handle box drawing
  const handleMouseDown = (event: React.MouseEvent) => {
    if (selectionMode !== 'box') return
    
    const coords = getImageCoordinates(event)
    if (!coords) return

    setIsDrawingBox(true)
    setBoxStart(coords)
    setCurrentBox({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y })
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDrawingBox || !boxStart) return
    
    const coords = getImageCoordinates(event)
    if (!coords) return

    setCurrentBox({
      x1: Math.min(boxStart.x, coords.x),
      y1: Math.min(boxStart.y, coords.y),
      x2: Math.max(boxStart.x, coords.x),
      y2: Math.max(boxStart.y, coords.y)
    })
  }

  const handleMouseUp = (event: React.MouseEvent) => {
    if (!isDrawingBox || !currentBox) return
    
    setIsDrawingBox(false)
    
    // Only trigger segmentation if box is reasonable size
    const width = currentBox.x2 - currentBox.x1
    const height = currentBox.y2 - currentBox.y1
    
    if (width > 10 && height > 10) {
      performSegmentation([], [currentBox])
    } else {
      toast({
        title: "Selection Not Found",
        description: "Please draw a larger box to select an object.",
        variant: "destructive",
      })
    }
  }

  // Perform SAM2 segmentation
  const performSegmentation = async (points: Array<{x: number, y: number, positive: boolean}>, boxes: Array<{x1: number, y1: number, x2: number, y2: number}>) => {
    if (!image) return
    if ((points.length === 0) && (boxes.length === 0)) {
      toast({
        title: "Selection Not Found",
        description: "Please select at least one point or box before segmenting.",
        variant: "destructive",
      })
      return
    }
    setIsSegmenting(true)
    try {
      // Prepare points for API
      const apiPoints = points.length > 0 ? points.map(p => [p.x, p.y]) : undefined
      const pointLabels = points.length > 0 ? points.map(p => p.positive ? 1 : 0) : undefined
      
      // Prepare boxes for API  
      const apiBoxes = boxes.length > 0 ? boxes.map(b => [b.x1, b.y1, b.x2, b.y2]) : undefined

      const response = await fetch('/api/sam2-segment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: image,
          points: apiPoints,
          point_labels: pointLabels,
          boxes: apiBoxes,
          multimask_output: true
        }),
      })

      let data: any = {}
      try {
        data = await response.json()
      } catch (e) {
        // fallback if not JSON
        data = { error: response.statusText }
      }

      if (!response.ok) {
        throw new Error((data.error ? `${data.error} (Status: ${response.status})` : `Segmentation failed (Status: ${response.status})`))
      }

      console.log('SAM2 Response:', data)

      // Create new region from response
      if (data.individual_masks && data.individual_masks.length > 0) {
        const newRegion: SegmentedRegion = {
          id: `region-${Date.now()}`,
          mask: {
            mask_url: data.individual_masks[0].mask_url,
            bbox: data.individual_masks[0].bbox,
            area: data.individual_masks[0].area,
            confidence: data.individual_masks[0].predicted_iou || data.individual_masks[0].stability_score
          },
          points: [...points],
          boxes: [...boxes],
          visible: true,
          name: `Selection ${selectedRegions.length + 1}`
        }

        setSelectedRegions(prev => [...prev, newRegion])
        setSelectedRegionId(newRegion.id)
        
        toast({
          title: "Object Selected",
          description: "Click 'Replace/Edit Object' to modify this selection",
        })
      }

    } catch (error: any) {
      console.error('Segmentation error:', error)
      toast({
        title: "Selection Failed",
        description: error.message || 'Failed to select object',
        variant: "destructive",
      })
    } finally {
      setIsSegmenting(false)
    }
  }

  // Clear current selection
  const clearCurrentSelection = () => {
    setCurrentPoints([])
    setCurrentBox(null)
    setBoxStart(null)
    setIsDrawingBox(false)
  }

  // Handle object editing
  const handleObjectEdit = async () => {
    if (!selectedRegionId || !editPrompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an object and enter an edit prompt",
        variant: "destructive",
      })
      return
    }

    const selectedRegion = selectedRegions.find(r => r.id === selectedRegionId)
    if (!selectedRegion || !selectedRegion.mask.mask_url) {
      toast({
        title: "No Mask Available",
        description: "Selected object doesn't have a valid mask",
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
          mask_url: selectedRegion.mask.mask_url,
          guidance_scale: guidanceScale[0],
          num_inference_steps: 28,
          strength: 0.8,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Object editing failed')
      }

      if (data.image?.image_url) {
        setImage(data.image.image_url)
        if (onImageGenerated) {
          onImageGenerated(data.image.image_url)
        }
        
        // Clear selections to allow re-selecting on edited image
        setSelectedRegions([])
        setSelectedRegionId('')
        clearCurrentSelection()
        
        toast({
          title: "Object Edited Successfully",
          description: "The selected object has been replaced/edited",
        })
      }
    } catch (error: any) {
      console.error('Object editing error:', error)
      toast({
        title: "Edit Failed",
        description: error.message || 'Failed to edit object',
        variant: "destructive",
      })
    } finally {
      setIsEditing(false)
    }
  }

  // Draw overlays on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get the displayed image dimensions
    const rect = img.getBoundingClientRect()
    
    // Set canvas size to match displayed image dimensions
    canvas.width = rect.width
    canvas.height = rect.height
    
    // Calculate scale factors for drawing coordinates
    const scaleX = rect.width / img.naturalWidth
    const scaleY = rect.height / img.naturalHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw current points
    currentPoints.forEach((point, index) => {
      ctx.fillStyle = point.positive ? '#00ff00' : '#ff0000'
      ctx.beginPath()
      ctx.arc(point.x * scaleX, point.y * scaleY, 8, 0, 2 * Math.PI)
      ctx.fill()
      
      // Add number
      ctx.fillStyle = 'white'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText((index + 1).toString(), point.x * scaleX, point.y * scaleY + 4)
    })

    // Draw current box
    if (currentBox) {
      ctx.strokeStyle = '#0099ff'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.strokeRect(
        currentBox.x1 * scaleX, 
        currentBox.y1 * scaleY, 
        (currentBox.x2 - currentBox.x1) * scaleX, 
        (currentBox.y2 - currentBox.y1) * scaleY
      )
    }

    // Draw selected regions
    selectedRegions.forEach((region, index) => {
      if (!region.visible) return

      const isSelected = region.id === selectedRegionId
      
      // Draw points
      region.points.forEach(point => {
        ctx.fillStyle = point.positive ? '#00aa00' : '#aa0000'
        ctx.beginPath()
        ctx.arc(point.x * scaleX, point.y * scaleY, isSelected ? 10 : 6, 0, 2 * Math.PI)
        ctx.fill()
      })

      // Draw boxes
      region.boxes.forEach(box => {
        ctx.strokeStyle = isSelected ? '#ff0000' : '#0066cc'
        ctx.lineWidth = isSelected ? 4 : 2
        ctx.setLineDash(isSelected ? [10, 5] : [])
        ctx.strokeRect(box.x1 * scaleX, box.y1 * scaleY, (box.x2 - box.x1) * scaleX, (box.y2 - box.y1) * scaleY)
      })

      // Draw label
      if (region.mask.bbox) {
        const [x, y] = region.mask.bbox
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(x * scaleX, y * scaleY - 25, 150, 20)
        
        ctx.fillStyle = 'white'
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'left'
        ctx.fillText(`${region.name} (${Math.round((region.mask.confidence || 0) * 100)}%)`, x * scaleX + 4, y * scaleY - 8)
      }
    })
  }, [currentPoints, currentBox, selectedRegions, selectedRegionId, image])

  const downloadImage = () => {
    if (!image) return
    
    const link = document.createElement('a')
    link.href = image
    link.download = `edited-image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Image Display */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Interactive Object Editor
              <div className="flex gap-2">
                {image && (
                  <Button variant="outline" size="sm" onClick={downloadImage}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-upload">Upload Image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-1"
                />
              </div>

              {/* Selection Mode Controls */}
              {image && (
                <div className="flex gap-2">
                  <Button
                    variant={selectionMode === 'point' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectionMode('point')}
                  >
                    <MousePointer className="h-4 w-4 mr-2" />
                    Point Mode
                  </Button>
                  <Button
                    variant={selectionMode === 'box' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectionMode('box')}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Box Mode
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCurrentSelection}
                    disabled={currentPoints.length === 0 && !currentBox}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              )}
              
              {image && (
                <div 
                  ref={containerRef}
                  className="relative border rounded-lg overflow-hidden cursor-crosshair"
                >
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Uploaded image"
                    className="w-full h-auto"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ 
                      opacity: 0.8,
                      width: '100%',
                      height: '100%'
                    }}
                  />
                  {/* Invisible overlay for mouse events */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    onClick={handleCanvasClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
              )}

              {/* Instructions */}
              {image && (
                <div className="text-sm text-gray-600 space-y-1">
                  {selectionMode === 'point' ? (
                    <>
                      <p>• <strong>Left click</strong> to add positive points (include in selection)</p>
                      <p>• <strong>Right click</strong> to add negative points (exclude from selection)</p>
                      <p>• Add multiple points to refine the selection</p>
                    </>
                  ) : (
                    <>
                      <p>• <strong>Click and drag</strong> to draw a bounding box around the object</p>
                      <p>• The entire box area will be used for selection</p>
                    </>
                  )}
                </div>
              )}

              {isSegmenting && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  <span>Analyzing selection...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        {/* Selected Regions */}
        {selectedRegions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Objects ({selectedRegions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedRegions.map((region, index) => (
                  <div
                    key={region.id}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      region.id === selectedRegionId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedRegionId(region.id === selectedRegionId ? '' : region.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }}
                        />
                        <span className="text-sm font-medium">{region.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {Math.round((region.mask.confidence || 0) * 100)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRegions(prev => prev.map(r => 
                              r.id === region.id ? { ...r, visible: !r.visible } : r
                            ))
                          }}
                        >
                          {region.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Controls */}
        {selectedRegionId && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Selected Object</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-prompt">Replacement Prompt</Label>
                <Input
                  id="edit-prompt"
                  placeholder="e.g., 'a red sports car', 'a beautiful flower', 'remove this object'"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Guidance Scale: {guidanceScale[0]}</Label>
                <Slider
                  value={guidanceScale}
                  onValueChange={setGuidanceScale}
                  max={15}
                  min={1}
                  step={0.5}
                  className="mt-2"
                />
              </div>
              
              <Button 
                onClick={handleObjectEdit}
                disabled={isEditing || !editPrompt.trim()}
                className="w-full"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Editing Object...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 w-4 mr-2" />
                    Replace/Edit Object
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>1. Upload an image</p>
            <p>2. Choose Point or Box selection mode</p>
            <p>3. Click on objects (Point) or draw boxes (Box) to select them</p>
            <p>4. Fine-tune selection with additional points</p>
            <p>5. Enter replacement prompt and click "Replace/Edit Object"</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 