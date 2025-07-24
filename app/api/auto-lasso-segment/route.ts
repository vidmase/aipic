import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { fal } from "@fal-ai/client"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      image_url,
      mode = 'auto', // 'auto', 'click', 'area', 'semantic'
      user_point,    // For click mode: {x, y}
      user_area,     // For area mode: {x1, y1, x2, y2}
      semantic_prompt, // For semantic mode: text description
      refine_selection = true,
      confidence_threshold = 0.8
    } = body

    // Validate required fields
    if (!image_url) {
      return NextResponse.json({ error: "image_url is required" }, { status: 400 })
    }

    console.log('Auto Lasso request:', { mode, user_point, user_area, semantic_prompt })

    let detectionResult = null
    let segmentationResult = null

    // Step 1: Semantic object detection with Florence-2 (for auto mode)
    if (mode === 'auto') {
      console.log('Performing Florence-2 semantic object detection...')
      
      try {
        detectionResult = await fal.run("fal-ai/florence-2-large/object-detection", {
          input: {
            image_url
          }
        })
        console.log('Florence-2 detection completed')
      } catch (error) {
        console.error('Florence-2 detection error:', error)
        // Continue without semantic labels if Florence-2 fails
      }
    }

    // Step 2: Initial object detection based on mode
    if (mode === 'auto' || mode === 'click' || mode === 'area') {
      // Use SAM2 auto-segment for comprehensive object detection
      console.log('Performing SAM2 auto-segmentation...')
      
      const sam2Payload: any = {
        image_url,
        points_per_side: 32,
        pred_iou_thresh: 0.88,
        stability_score_thresh: 0.95,
        min_mask_region_area: 100,
      }

      // Add specific prompts based on mode
      if (mode === 'click' && user_point) {
        sam2Payload.points = [[user_point.x, user_point.y]]
        sam2Payload.point_labels = [1] // Positive point
      } else if (mode === 'area' && user_area) {
        sam2Payload.boxes = [[user_area.x1, user_area.y1, user_area.x2, user_area.y2]]
      }

      try {
        segmentationResult = await fal.run("fal-ai/sam2/auto-segment", {
          input: sam2Payload,
        })
        console.log('SAM2 segmentation completed')
      } catch (error) {
        console.error('SAM2 segmentation error:', error)
        return NextResponse.json({ 
          error: "Failed to perform auto-segmentation",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
      }
    }

    // Step 2: Semantic object detection if requested
    if (mode === 'semantic' && semantic_prompt) {
      console.log('Performing semantic object detection...')
      
      try {
        detectionResult = await fal.run("fal-ai/moondream-next/detection", {
          input: {
            image_url,
            task_type: "bbox_detection",
            detection_prompt: semantic_prompt
          }
        })
        console.log('Semantic detection completed')
      } catch (error) {
        console.error('Semantic detection error:', error)
        // Continue with SAM2 results if semantic detection fails
        console.log('Falling back to SAM2 auto-segmentation...')
        
        try {
          segmentationResult = await fal.run("fal-ai/sam2/auto-segment", {
            input: {
              image_url,
              points_per_side: 32,
              pred_iou_thresh: 0.88,
              stability_score_thresh: 0.95,
              min_mask_region_area: 100,
            }
          })
        } catch (sam2Error) {
          console.error('Fallback SAM2 error:', sam2Error)
          return NextResponse.json({ 
            error: "Both semantic detection and auto-segmentation failed",
            details: {
              semantic_error: error instanceof Error ? error.message : String(error),
              sam2_error: sam2Error instanceof Error ? sam2Error.message : String(sam2Error)
            }
          }, { status: 500 })
        }
      }
    }

    // Step 3: Process and combine results
    const processedObjects: any[] = []

    // Get Florence-2 detection results for semantic labeling
    const florenceData = (detectionResult as any)?.data || detectionResult
    const florenceDetections = florenceData?.results?.bboxes || []
    console.log('Florence-2 detections found:', florenceDetections.length)

    // Create a function to find the best semantic label for a mask
    const findSemanticLabel = (maskBbox: number[], index: number): string => {
      if (florenceDetections.length === 0) {
        return `Object ${index + 1}`
      }

      // Calculate center of mask bbox
      const maskCenterX = maskBbox[0] + maskBbox[2] / 2
      const maskCenterY = maskBbox[1] + maskBbox[3] / 2

      // Find the closest Florence-2 detection
      let bestMatch = null
      let bestDistance = Infinity

      for (const detection of florenceDetections) {
        const detectionCenterX = detection.x + detection.w / 2
        const detectionCenterY = detection.y + detection.h / 2
        
        const distance = Math.sqrt(
          Math.pow(maskCenterX - detectionCenterX, 2) + 
          Math.pow(maskCenterY - detectionCenterY, 2)
        )
        
        if (distance < bestDistance) {
          bestDistance = distance
          bestMatch = detection
        }
      }

      // Return semantic label if close enough, otherwise generic name
      return bestMatch && bestDistance < 100 ? bestMatch.label : `Object ${index + 1}`
    }

    // Process SAM2 segmentation results
    const segmentationData = (segmentationResult as any)?.data || segmentationResult
    if (segmentationData?.individual_masks) {
      segmentationData.individual_masks.forEach((mask: any, index: number) => {
        // Handle both URL string format and object format
        const maskUrl = typeof mask === 'string' ? mask : (mask.url || mask.mask_url)
        const confidence = mask.confidence || 0.8 // Default confidence for auto-segmented objects
        const bbox = mask.bbox || [index * 50, index * 50, (index + 1) * 50, (index + 1) * 50]
        
        if (confidence >= confidence_threshold) {
          // Get semantic label from Florence-2
          const semanticLabel = findSemanticLabel(bbox, index)
          
          processedObjects.push({
            id: `sam2_${index}`,
            type: 'segmentation',
            bbox: bbox,
            mask_url: maskUrl,
            confidence: confidence,
            label: semanticLabel,
            source: 'sam2',
            area: mask.area || calculateBboxArea(bbox)
          })
        }
      })
    }

    // Process semantic detection results
    const detectionData = (detectionResult as any)?.data || detectionResult
    if (detectionData?.detections) {
      detectionData.detections.forEach((detection: any, index: number) => {
        processedObjects.push({
          id: `semantic_${index}`,
          type: 'detection',
          bbox: detection.bbox,
          confidence: detection.confidence || 0.9,
          label: detection.label || semantic_prompt,
          source: 'semantic',
          area: calculateBboxArea(detection.bbox)
        })
      })
    }

    // Step 4: Smart object selection based on user input
    let selectedObjects = processedObjects

    if (mode === 'click' && user_point) {
      // Find objects closest to user's click
      selectedObjects = findObjectsNearPoint(processedObjects, user_point)
    } else if (mode === 'area' && user_area) {
      // Find objects within or overlapping the user's area
      selectedObjects = findObjectsInArea(processedObjects, user_area)
    }

    // Step 5: Refine selection if requested
    if (refine_selection && selectedObjects.length > 0 && (user_point || user_area)) {
      console.log('Refining object selection...')
      
      const refinedObjects = []
      
      for (const obj of selectedObjects.slice(0, 3)) { // Limit to top 3 objects
        try {
          const refinePayload: any = {
            image_url,
            multimask_output: true
          }

          if (user_point) {
            refinePayload.points = [[user_point.x, user_point.y]]
            refinePayload.point_labels = [1]
          }

          if (obj.bbox) {
            refinePayload.boxes = [obj.bbox]
          }

          const refinementResult = await fal.run("fal-ai/sam2", {
            input: refinePayload
          })

          const refinementData = (refinementResult as any)?.data || refinementResult
          if (refinementData?.masks && refinementData.masks.length > 0) {
            const bestMask = refinementData.masks[0]
            refinedObjects.push({
              ...obj,
              id: `refined_${obj.id}`,
              mask_url: bestMask.mask_url,
              confidence: Math.min(obj.confidence + 0.1, 1.0), // Boost confidence for refined objects
              refined: true
            })
          } else {
            refinedObjects.push(obj) // Keep original if refinement fails
          }
        } catch (refineError) {
          console.error('Refinement error for object:', obj.id, refineError)
          refinedObjects.push(obj) // Keep original if refinement fails
        }
      }
      
      selectedObjects = refinedObjects
    }

    // Step 6: Sort by relevance
    selectedObjects.sort((a, b) => {
      // Prioritize refined objects, then by confidence, then by area
      if (a.refined && !b.refined) return -1
      if (!a.refined && b.refined) return 1
      if (a.confidence !== b.confidence) return b.confidence - a.confidence
      return (b.area || 0) - (a.area || 0)
    })

    // Log successful generation
    const { error: logError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        model: 'auto-lasso',
        prompt: `Auto Lasso ${mode}: ${selectedObjects.length} objects detected`,
        image_url: image_url,
        parameters: {
          mode,
          user_point,
          user_area,
          semantic_prompt,
          objects_found: selectedObjects.length,
          confidence_threshold
        }
      })

    if (logError) {
      console.error('Error logging generation:', logError)
    }

    return NextResponse.json({
      success: true,
      mode,
      objects_detected: processedObjects.length,
      objects_selected: selectedObjects.length,
      selected_objects: selectedObjects,
      all_objects: processedObjects,
      metadata: {
        user_point,
        user_area,
        semantic_prompt,
        confidence_threshold,
        refined: refine_selection,
        sam2_result: !!segmentationResult,
        semantic_result: !!detectionResult
      }
    })

  } catch (error: any) {
    console.error('Auto Lasso error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message
    }, { status: 500 })
  }
}

// Helper functions
function calculateBboxArea(bbox: number[]): number {
  if (!bbox || bbox.length < 4) return 0
  return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
}

function findObjectsNearPoint(objects: any[], point: {x: number, y: number}): any[] {
  return objects
    .map(obj => {
      if (!obj.bbox) return { ...obj, distance: Infinity }
      
      const centerX = (obj.bbox[0] + obj.bbox[2]) / 2
      const centerY = (obj.bbox[1] + obj.bbox[3]) / 2
      const distance = Math.sqrt(
        Math.pow(centerX - point.x, 2) + 
        Math.pow(centerY - point.y, 2)
      )
      
      // Check if point is inside bbox
      const isInside = point.x >= obj.bbox[0] && point.x <= obj.bbox[2] &&
                      point.y >= obj.bbox[1] && point.y <= obj.bbox[3]
      
      return { ...obj, distance, isInside }
    })
    .sort((a, b) => {
      // Prioritize objects that contain the point
      if (a.isInside && !b.isInside) return -1
      if (!a.isInside && b.isInside) return 1
      // Then sort by distance
      return a.distance - b.distance
    })
    .slice(0, 5) // Return top 5 closest objects
}

function findObjectsInArea(objects: any[], area: {x1: number, y1: number, x2: number, y2: number}): any[] {
  const areaBox = [
    Math.min(area.x1, area.x2),
    Math.min(area.y1, area.y2),
    Math.max(area.x1, area.x2),
    Math.max(area.y1, area.y2)
  ]
  
  return objects
    .map(obj => {
      if (!obj.bbox) return { ...obj, overlap: 0 }
      
      // Calculate intersection area
      const intersectionArea = calculateIntersection(obj.bbox, areaBox)
      const objectArea = calculateBboxArea(obj.bbox)
      const overlap = objectArea > 0 ? intersectionArea / objectArea : 0
      
      return { ...obj, overlap }
    })
    .filter(obj => obj.overlap > 0.1) // Keep objects with >10% overlap
    .sort((a, b) => b.overlap - a.overlap) // Sort by overlap percentage
}

function calculateIntersection(bbox1: number[], bbox2: number[]): number {
  const x1 = Math.max(bbox1[0], bbox2[0])
  const y1 = Math.max(bbox1[1], bbox2[1])
  const x2 = Math.min(bbox1[2], bbox2[2])
  const y2 = Math.min(bbox1[3], bbox2[3])
  
  if (x2 <= x1 || y2 <= y1) return 0
  return (x2 - x1) * (y2 - y1)
} 