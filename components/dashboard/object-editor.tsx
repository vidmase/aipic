'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Trash2, 
  Edit, 
  Copy, 
  Move, 
  Palette, 
  Maximize2, 
  RotateCcw, 
  Wand2, 
  Download,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

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

interface ObjectEditorProps {
  selectedObject: DetectedObject | null
  selectedObjectIndex: number | null
  imageUrl: string
  onObjectUpdate?: (updatedObject: DetectedObject, index: number) => void
  onObjectDelete?: (index: number) => void
  onEditComplete?: (editedImageUrl: string) => void
}

export function ObjectEditor({ 
  selectedObject, 
  selectedObjectIndex, 
  imageUrl,
  onObjectUpdate,
  onObjectDelete,
  onEditComplete
}: ObjectEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingOperation, setEditingOperation] = useState<string>('')
  const [editParams, setEditParams] = useState({
    replaceWith: '',
    color: '#ffffff',
    scale: 1,
    rotation: 0,
    opacity: 1
  })

  const handleRemoveObject = async () => {
    if (!selectedObject || selectedObjectIndex === null) return

    setIsEditing(true)
    setEditingOperation('Removing object...')
    
    try {
      // Call inpainting API to remove the object
      const requestBody: any = {
        image_url: imageUrl,
        operation: 'remove'
      }

      // Use mask_url if available, otherwise fall back to coordinates
      if (selectedObject.mask_url) {
        requestBody.mask_url = selectedObject.mask_url
      } else {
        requestBody.mask_coordinates = {
          x: selectedObject.x,
          y: selectedObject.y,
          width: selectedObject.w,
          height: selectedObject.h
        }
      }

      const response = await fetch('/api/inpaint-object', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to remove object')
      }

      const data = await response.json()
      onEditComplete?.(data.edited_image_url)
      onObjectDelete?.(selectedObjectIndex)
      toast.success(`${selectedObject.label} removed successfully`)
    } catch (error) {
      console.error('Error removing object:', error)
      toast.error('Failed to remove object')
    } finally {
      setIsEditing(false)
      setEditingOperation('')
    }
  }

  const handleReplaceObject = async () => {
    if (!selectedObject || selectedObjectIndex === null || !editParams.replaceWith) return

    setIsEditing(true)
    setEditingOperation('Replacing object...')
    
    try {
      const requestBody: any = {
        image_url: imageUrl,
        replacement_prompt: editParams.replaceWith,
        original_label: selectedObject.label
      }

      // Use mask_url if available, otherwise fall back to coordinates
      if (selectedObject.mask_url) {
        requestBody.mask_url = selectedObject.mask_url
      } else {
        requestBody.mask_coordinates = {
          x: selectedObject.x,
          y: selectedObject.y,
          width: selectedObject.w,
          height: selectedObject.h
        }
      }

      const response = await fetch('/api/replace-object', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to replace object')
      }

      const data = await response.json()
      onEditComplete?.(data.edited_image_url)
      toast.success(`${selectedObject.label} replaced with ${editParams.replaceWith}`)
    } catch (error) {
      console.error('Error replacing object:', error)
      toast.error('Failed to replace object')
    } finally {
      setIsEditing(false)
      setEditingOperation('')
    }
  }

  const handleModifyObject = async (modificationType: string) => {
    if (!selectedObject || selectedObjectIndex === null) return

    setIsEditing(true)
    setEditingOperation(`Modifying ${selectedObject.label}...`)
    
    try {
      const requestBody: any = {
        image_url: imageUrl,
        modification_type: modificationType,
        parameters: editParams
      }

      // Use mask_url if available, otherwise fall back to coordinates
      if (selectedObject.mask_url) {
        requestBody.mask_url = selectedObject.mask_url
      } else {
        requestBody.mask_coordinates = {
          x: selectedObject.x,
          y: selectedObject.y,
          width: selectedObject.w,
          height: selectedObject.h
        }
      }

      const response = await fetch('/api/modify-object', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to modify object')
      }

      const data = await response.json()
      onEditComplete?.(data.edited_image_url)
      toast.success(`${selectedObject.label} modified successfully`)
    } catch (error) {
      console.error('Error modifying object:', error)
      toast.error('Failed to modify object')
    } finally {
      setIsEditing(false)
      setEditingOperation('')
    }
  }

  if (!selectedObject) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Object Editor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Select an object from the detection list to start editing
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Editing: {selectedObject.label}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline">{Math.round(selectedObject.w)}×{Math.round(selectedObject.h)}</Badge>
          <Badge variant="outline">{Math.round(selectedObject.confidence! * 100)}% confidence</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="remove" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="remove">Remove</TabsTrigger>
            <TabsTrigger value="replace">Replace</TabsTrigger>
            <TabsTrigger value="modify">Modify</TabsTrigger>
          </TabsList>
          
          <TabsContent value="remove" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Remove Object</h3>
              <p className="text-sm text-gray-600">
                Remove the selected {selectedObject.label} and intelligently fill the background
              </p>
            </div>
            <Button 
              onClick={handleRemoveObject}
              disabled={isEditing}
              className="w-full"
              variant="destructive"
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingOperation}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove {selectedObject.label}
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="replace" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Replace Object</h3>
              <p className="text-sm text-gray-600">
                Replace the selected {selectedObject.label} with something else
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replaceWith">Replace with:</Label>
              <Input
                id="replaceWith"
                placeholder="e.g., modern sofa, wooden table, green plant"
                value={editParams.replaceWith}
                onChange={(e) => setEditParams({...editParams, replaceWith: e.target.value})}
              />
            </div>
            <Button 
              onClick={handleReplaceObject}
              disabled={isEditing || !editParams.replaceWith}
              className="w-full"
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingOperation}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Replace {selectedObject.label}
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="modify" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Modify Object</h3>
              <p className="text-sm text-gray-600">
                Change properties of the selected {selectedObject.label}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editParams.color}
                    onChange={(e) => setEditParams({...editParams, color: e.target.value})}
                    className="w-16 h-10"
                  />
                  <Input
                    value={editParams.color}
                    onChange={(e) => setEditParams({...editParams, color: e.target.value})}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Scale: {editParams.scale}x</Label>
                <Slider
                  value={[editParams.scale]}
                  onValueChange={(value) => setEditParams({...editParams, scale: value[0]})}
                  min={0.5}
                  max={2}
                  step={0.1}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Opacity: {Math.round(editParams.opacity * 100)}%</Label>
                <Slider
                  value={[editParams.opacity]}
                  onValueChange={(value) => setEditParams({...editParams, opacity: value[0]})}
                  min={0.1}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => handleModifyObject('color')}
                disabled={isEditing}
                variant="outline"
              >
                <Palette className="mr-2 h-4 w-4" />
                Change Color
              </Button>
              <Button 
                onClick={() => handleModifyObject('scale')}
                disabled={isEditing}
                variant="outline"
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                Resize
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 