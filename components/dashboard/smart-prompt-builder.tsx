"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Palette, 
  Lightbulb, 
  Camera, 
  X, 
  Copy,
  Shuffle,
  Wand2,
  Eye,
  Sun,
  Brush,
  Image as ImageIcon
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PromptSuggestion {
  category: string
  items: string[]
}

interface SmartPromptBuilderProps {
  initialPrompt?: string
  onPromptChange: (prompt: string) => void
  onClose?: () => void
}

const PROMPT_SUGGESTIONS: Record<string, PromptSuggestion> = {
  styles: {
    category: "Art Styles",
    items: [
      "photorealistic", "hyperrealistic", "cinematic", "artistic", "abstract",
      "minimalist", "vintage", "retro", "futuristic", "cyberpunk",
      "steampunk", "art nouveau", "impressionist", "surreal", "gothic",
      "anime", "cartoon", "pixel art", "oil painting", "watercolor",
      "digital art", "concept art", "matte painting", "sketch", "line art"
    ]
  },
  moods: {
    category: "Mood & Atmosphere",
    items: [
      "serene", "dramatic", "mysterious", "romantic", "energetic",
      "melancholic", "joyful", "peaceful", "intense", "dreamy",
      "nostalgic", "epic", "intimate", "powerful", "ethereal",
      "dark", "bright", "moody", "uplifting", "contemplative",
      "whimsical", "elegant", "bold", "subtle", "vibrant"
    ]
  },
  lighting: {
    category: "Lighting & Time",
    items: [
      "golden hour", "blue hour", "sunset", "sunrise", "midday sun",
      "soft lighting", "hard lighting", "dramatic lighting", "backlighting", "rim lighting",
      "studio lighting", "natural lighting", "candlelight", "neon lighting", "moonlight",
      "overcast", "sunny", "stormy", "foggy", "misty",
      "volumetric lighting", "god rays", "chiaroscuro", "high contrast", "low key"
    ]
  },
  composition: {
    category: "Composition & Framing",
    items: [
      "close-up", "wide shot", "medium shot", "extreme close-up", "bird's eye view",
      "low angle", "high angle", "dutch angle", "symmetrical", "asymmetrical",
      "rule of thirds", "centered", "leading lines", "depth of field", "bokeh",
      "shallow focus", "deep focus", "foreground", "background", "silhouette",
      "portrait orientation", "landscape orientation", "square format", "panoramic", "macro"
    ]
  },
  colors: {
    category: "Color Palette",
    items: [
      "monochromatic", "black and white", "sepia", "vibrant colors", "muted colors",
      "warm tones", "cool tones", "earth tones", "pastel colors", "neon colors",
      "blue and orange", "complementary colors", "analogous colors", "triadic colors",
      "high saturation", "desaturated", "color grading", "film look", "vintage colors"
    ]
  },
  subjects: {
    category: "Subject Ideas",
    items: [
      "portrait", "landscape", "cityscape", "nature", "architecture",
      "still life", "abstract", "fantasy", "sci-fi", "historical",
      "animals", "people", "objects", "vehicles", "technology",
      "food", "fashion", "interior", "exterior", "underwater",
      "space", "mountains", "forest", "ocean", "desert"
    ]
  }
}

const COLOR_SWATCHES = [
  { name: "vibrant red", color: "#FF0000", description: "vibrant red colors" },
  { name: "deep blue", color: "#0066CC", description: "deep blue tones" },
  { name: "emerald green", color: "#50C878", description: "emerald green hues" },
  { name: "golden yellow", color: "#FFD700", description: "golden yellow shades" },
  { name: "royal purple", color: "#7851A9", description: "royal purple colors" },
  { name: "sunset orange", color: "#FF8C00", description: "sunset orange tones" },
  { name: "soft pink", color: "#FFB6C1", description: "soft pink hues" },
  { name: "forest green", color: "#228B22", description: "forest green colors" },
  { name: "sky blue", color: "#87CEEB", description: "sky blue tones" },
  { name: "warm coral", color: "#FF7F50", description: "warm coral shades" },
  { name: "lavender", color: "#E6E6FA", description: "lavender colors" },
  { name: "crimson", color: "#DC143C", description: "crimson red tones" },
  { name: "turquoise", color: "#40E0D0", description: "turquoise colors" },
  { name: "amber", color: "#FFBF00", description: "amber golden tones" },
  { name: "sage green", color: "#9CAF88", description: "sage green hues" },
  { name: "dusty rose", color: "#DCAE96", description: "dusty rose colors" },
  { name: "navy blue", color: "#000080", description: "navy blue tones" },
  { name: "mint green", color: "#98FB98", description: "mint green colors" },
  { name: "burgundy", color: "#800020", description: "burgundy wine colors" },
  { name: "cream", color: "#FFFDD0", description: "cream ivory tones" },
  { name: "charcoal", color: "#36454F", description: "charcoal gray colors" },
  { name: "peach", color: "#FFCBA4", description: "peach soft colors" },
  { name: "teal", color: "#008080", description: "teal blue-green" },
  { name: "bronze", color: "#CD7F32", description: "bronze metallic tones" }
]

// Variation modifiers for generating different versions
const VARIATION_MODIFIERS = {
  styles: [
    "photorealistic", "artistic", "cinematic", "painterly", "sketch-like", 
    "digital art", "oil painting", "watercolor", "minimalist", "detailed"
  ],
  moods: [
    "dramatic", "serene", "energetic", "mysterious", "romantic", 
    "melancholic", "joyful", "intense", "peaceful", "dynamic"
  ],
  lighting: [
    "golden hour", "studio lighting", "natural light", "dramatic shadows", 
    "soft lighting", "backlighting", "neon lighting", "candlelight", "moonlight", "harsh lighting"
  ],
  colors: [
    "vibrant colors", "muted tones", "warm palette", "cool palette", 
    "monochrome", "high contrast", "pastel colors", "earth tones", "neon colors", "desaturated"
  ],
  composition: [
    "close-up", "wide shot", "bird's eye view", "low angle", 
    "symmetrical", "rule of thirds", "centered", "off-center", "macro", "panoramic"
  ],
  atmosphere: [
    "foggy", "clear", "stormy", "sunny", "overcast", 
    "misty", "bright", "dark", "ethereal", "gritty"
  ]
}

export function SmartPromptBuilder({ initialPrompt = "", onPromptChange, onClose }: SmartPromptBuilderProps) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showVariations, setShowVariations] = useState(false)
  const [generatedVariations, setGeneratedVariations] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const tags = selectedTags.length > 0 ? selectedTags.join(", ") : ""
    const newPrompt = prompt + (prompt && tags ? ", " : "") + tags
    onPromptChange(newPrompt)
  }, [prompt, selectedTags, onPromptChange])

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag])
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  const shufflePrompt = () => {
    const categories = Object.keys(PROMPT_SUGGESTIONS)
    const randomTags = categories.map(category => {
      const items = PROMPT_SUGGESTIONS[category].items
      return items[Math.floor(Math.random() * items.length)]
    }).slice(0, 4)
    
    setSelectedTags(randomTags)
    toast({
      title: "Prompt Shuffled!",
      description: "Generated random suggestions for inspiration"
    })
  }

  const copyPrompt = () => {
    const fullPrompt = prompt + (prompt && selectedTags.length > 0 ? ", " : "") + selectedTags.join(", ")
    navigator.clipboard.writeText(fullPrompt)
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard"
    })
  }

  const clearAll = () => {
    setPrompt("")
    setSelectedTags([])
    setShowVariations(false)
    setGeneratedVariations([])
  }

  const generateVariations = () => {
    if (!fullPrompt.trim()) {
      toast({
        title: "No prompt to vary",
        description: "Please enter a base prompt first"
      })
      return
    }

    const variations: string[] = []
    
    // Base prompt transformation patterns
    const transformPrompt = (basePrompt: string, variationType: string) => {
      let transformedPrompt = basePrompt.toLowerCase()
      
      // Action transformations
      const actionTransforms = {
        "artistic": {
          "running": "gracefully dancing", "walking": "elegantly posing", "sitting": "contemplatively resting",
          "standing": "majestically posed", "jumping": "leaping with grace", "flying": "soaring elegantly",
          "swimming": "floating serenely", "driving": "traveling through", "working": "creating art",
          "eating": "savoring", "drinking": "sipping", "sleeping": "dreaming", "reading": "studying ancient texts"
        },
        "cinematic": {
          "running": "sprinting dramatically", "walking": "striding confidently", "sitting": "brooding intensely",
          "standing": "commanding the scene", "jumping": "leaping heroically", "flying": "soaring majestically",
          "swimming": "diving powerfully", "driving": "racing through", "working": "battling against",
          "eating": "consuming", "drinking": "gulping", "sleeping": "resting before battle", "reading": "deciphering secrets"
        },
        "fantasy": {
          "running": "floating swiftly", "walking": "gliding mysteriously", "sitting": "meditating magically",
          "standing": "hovering ethereally", "jumping": "teleporting", "flying": "soaring on wings",
          "swimming": "moving through liquid starlight", "driving": "riding mystical creatures", "working": "casting spells",
          "eating": "consuming magical essence", "drinking": "sipping elixirs", "sleeping": "dreaming in other dimensions", "reading": "channeling ancient wisdom"
        }
      }
      
      // Apply action transformations
      const transforms = actionTransforms[variationType as keyof typeof actionTransforms]
      if (transforms) {
        Object.entries(transforms).forEach(([original, replacement]) => {
          const regex = new RegExp(`\\b${original}\\b`, 'gi')
          transformedPrompt = transformedPrompt.replace(regex, replacement)
        })
      }
      
      // Subject enhancements
      const subjectEnhancements = {
        "artistic": {
          "man": "elegant gentleman", "woman": "graceful lady", "person": "artistic figure",
          "child": "innocent youth", "cat": "majestic feline", "dog": "noble canine",
          "bird": "ethereal creature", "tree": "ancient oak", "flower": "blooming masterpiece"
        },
        "cinematic": {
          "man": "heroic warrior", "woman": "powerful protagonist", "person": "legendary figure",
          "child": "young hero", "cat": "fierce predator", "dog": "loyal companion",
          "bird": "soaring eagle", "tree": "towering sentinel", "flower": "symbol of hope"
        },
        "fantasy": {
          "man": "mystical sorcerer", "woman": "enchanted sorceress", "person": "magical being",
          "child": "young wizard", "cat": "shapeshifting familiar", "dog": "guardian spirit",
          "bird": "phoenix", "tree": "world tree", "flower": "magical bloom"
        }
      }
      
      // Apply subject enhancements
      const enhancements = subjectEnhancements[variationType as keyof typeof subjectEnhancements]
      if (enhancements) {
        Object.entries(enhancements).forEach(([original, replacement]) => {
          const regex = new RegExp(`\\b${original}\\b`, 'gi')
          transformedPrompt = transformedPrompt.replace(regex, replacement)
        })
      }
      
      return transformedPrompt
    }
    
    // Create 3 dramatically different creative variations
    const creativeVariations = [
      {
        name: "Artistic & Stylized",
        type: "artistic",
        modifiers: [
          ...VARIATION_MODIFIERS.styles.filter(s => s.includes("art") || s.includes("paint") || s.includes("sketch")),
          ...VARIATION_MODIFIERS.moods.filter(m => m.includes("dramatic") || m.includes("ethereal") || m.includes("dreamy")),
          ...VARIATION_MODIFIERS.lighting.filter(l => l.includes("dramatic") || l.includes("golden") || l.includes("chiaroscuro")),
          "highly detailed", "masterpiece", "trending on artstation"
        ]
      },
      {
        name: "Cinematic & Epic",
        type: "cinematic",
        modifiers: [
          "cinematic", "epic scale", "movie poster style", "dramatic lighting",
          ...VARIATION_MODIFIERS.composition.filter(c => c.includes("wide") || c.includes("low angle") || c.includes("bird")),
          ...VARIATION_MODIFIERS.atmosphere.filter(a => a.includes("stormy") || a.includes("dramatic") || a.includes("epic")),
          "film grain", "anamorphic lens", "depth of field"
        ]
      },
      {
        name: "Surreal & Fantasy",
        type: "fantasy",
        modifiers: [
          "surreal", "fantasy art", "magical realism", "otherworldly",
          ...VARIATION_MODIFIERS.colors.filter(c => c.includes("vibrant") || c.includes("neon") || c.includes("ethereal")),
          "floating elements", "impossible architecture", "dreamlike quality",
          "digital art", "concept art", "mystical atmosphere"
        ]
      }
    ]
    
    // Generate 3 unique variations with completely different approaches
    creativeVariations.forEach((variation, index) => {
      // Transform the base prompt according to the variation type
      const transformedPrompt = transformPrompt(fullPrompt, variation.type)
      
      // Randomly select 4-6 modifiers from each variation type
      const shuffledModifiers = variation.modifiers.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 4)
      const variationPrompt = `${transformedPrompt}, ${shuffledModifiers.join(", ")}`
      variations.push(variationPrompt)
    })
    
    setGeneratedVariations(variations)
    setShowVariations(true)
    toast({
      title: "Creative Variations Generated!",
      description: "Created 3 unique interpretations with modified prompts"
    })
  }

  const applyVariation = (variation: string) => {
    // Extract the base prompt (everything before the first comma after the original prompt)
    const basePrompt = variation.split(", ").slice(0, -2).join(", ")
    setPrompt(basePrompt)
    setSelectedTags([])
    setShowVariations(false)
    onPromptChange(variation)
    toast({
      title: "Variation Applied!",
      description: "Using this variation as your new prompt"
    })
  }

  const filteredSuggestions = (category: string) => {
    if (!searchTerm) return PROMPT_SUGGESTIONS[category].items
    return PROMPT_SUGGESTIONS[category].items.filter(item =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const fullPrompt = prompt + (prompt && selectedTags.length > 0 ? ", " : "") + selectedTags.join(", ")

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-xl">Smart Prompt Builder</CardTitle>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={generateVariations} className="flex-shrink-0">
              <Wand2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Generate Variations</span>
              <span className="sm:hidden">Variations</span>
            </Button>
            <Button variant="outline" size="sm" onClick={shufflePrompt} className="flex-shrink-0">
              <Shuffle className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Shuffle</span>
            </Button>
            <Button variant="outline" size="sm" onClick={copyPrompt} className="flex-shrink-0">
              <Copy className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose} className="flex-shrink-0">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          Build amazing prompts with AI-powered suggestions for style, mood, lighting, and composition
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8 p-6">
        {/* Main Prompt Input */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border space-y-3">
          <Label htmlFor="main-prompt" className="text-base font-medium">Base Prompt</Label>
          <Textarea
            id="main-prompt"
            placeholder="Describe your main subject or scene..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] text-base"
          />
        </div>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
            <Label className="text-base font-medium text-blue-900 dark:text-blue-100">Selected Enhancements</Label>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 px-3 py-1 text-sm"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-2" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Final Prompt Preview */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800 space-y-3">
          <Label className="text-base font-medium text-purple-900 dark:text-purple-100">Final Prompt Preview</Label>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border min-h-[80px]">
            <p className="text-sm leading-relaxed">{fullPrompt || "Your enhanced prompt will appear here..."}</p>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">{fullPrompt.length} characters</span>
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
              Clear All
            </Button>
          </div>
        </div>

        {/* Image Variations */}
        {showVariations && generatedVariations.length > 0 && (
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 p-6 rounded-lg border border-cyan-200 dark:border-cyan-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-cyan-600" />
                <Label className="text-lg font-medium text-cyan-900 dark:text-cyan-100">Prompt Variations</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateVariations}
                className="text-cyan-600 border-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900"
              >
                Generate New
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {generatedVariations.map((variation, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-600 transition-colors cursor-pointer group"
                  onClick={() => applyVariation(variation)}
                >
                                      <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                            {index === 0 ? "🎨 Artistic & Stylized" : 
                             index === 1 ? "🎬 Cinematic & Epic" : 
                             "✨ Surreal & Fantasy"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Variation {index + 1}
                          </span>
                        </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(variation)
                            toast({
                              title: "Copied!",
                              description: "Variation copied to clipboard"
                            })
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-24 overflow-hidden">
                      <p className="break-words">
                        {variation.length > 150 ? `${variation.substring(0, 150)}...` : variation}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                      Click to use this variation
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border space-y-3">
          <Label className="text-base font-medium">Search Suggestions</Label>
          <Input
            placeholder="Search for styles, moods, lighting..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Suggestion Categories */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">Enhancement Categories</h3>
          </div>
          
          <Tabs defaultValue="styles" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1">
              <TabsTrigger value="styles" className="flex flex-col items-center gap-1 py-3 px-2">
                <Brush className="w-4 h-4" />
                <span className="text-xs font-medium">Styles</span>
              </TabsTrigger>
              <TabsTrigger value="moods" className="flex flex-col items-center gap-1 py-3 px-2">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-medium">Moods</span>
              </TabsTrigger>
              <TabsTrigger value="lighting" className="flex flex-col items-center gap-1 py-3 px-2">
                <Sun className="w-4 h-4" />
                <span className="text-xs font-medium">Lighting</span>
              </TabsTrigger>
              <TabsTrigger value="composition" className="flex flex-col items-center gap-1 py-3 px-2">
                <Camera className="w-4 h-4" />
                <span className="text-xs font-medium">Framing</span>
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex flex-col items-center gap-1 py-3 px-2">
                <Palette className="w-4 h-4" />
                <span className="text-xs font-medium">Colors</span>
              </TabsTrigger>
              <TabsTrigger value="subjects" className="flex flex-col items-center gap-1 py-3 px-2">
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs font-medium">Subjects</span>
              </TabsTrigger>
            </TabsList>

            {Object.entries(PROMPT_SUGGESTIONS).map(([key, category]) => (
              <TabsContent key={key} value={key} className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">{category.category}</h4>
                    <span className="text-xs text-gray-500">
                      {key === 'colors' ? COLOR_SWATCHES.length : filteredSuggestions(key).length} options
                    </span>
                  </div>
                  
                  <ScrollArea className="h-64">
                    {key === 'colors' ? (
                      // Special color swatch layout
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 pr-4">
                        {COLOR_SWATCHES.filter(swatch => 
                          !searchTerm || swatch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          swatch.description.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((swatch) => (
                          <div
                            key={swatch.name}
                            className={`cursor-pointer transition-all duration-200 hover:scale-110 ${
                              selectedTags.includes(swatch.description) ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                            }`}
                            onClick={() => 
                              selectedTags.includes(swatch.description) 
                                ? removeTag(swatch.description) 
                                : addTag(swatch.description)
                            }
                            title={swatch.name}
                          >
                            <div 
                              className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow relative group"
                              style={{ backgroundColor: swatch.color }}
                            >
                              {selectedTags.includes(swatch.description) && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400 capitalize">
                              {swatch.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Regular badge layout for other categories
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pr-4">
                        {filteredSuggestions(key).map((item) => (
                          <Badge
                            key={item}
                            variant={selectedTags.includes(item) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-2 text-center justify-center h-auto min-h-[36px] flex items-center"
                            onClick={() => 
                              selectedTags.includes(item) ? removeTag(item) : addTag(item)
                            }
                          >
                            <span className="text-xs font-medium">{item}</span>
                                                         {selectedTags.includes(item) && (
                               <X className="w-3 h-3 ml-1 shrink-0" />
                             )}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Pro Tips:</p>
              <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                <li>• Start with a clear subject, then add style and mood enhancements</li>
                <li>• Use specific lighting terms for more dramatic results</li>
                <li>• Combine 3-5 enhancement tags for best results</li>
                <li>• Try templates for quick professional-quality prompts</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 