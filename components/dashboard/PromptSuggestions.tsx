import React, { useState } from "react"
import { Button } from "@/components/ui/button"

const CATEGORIES = [
  { label: "Digital Art", value: "digital-art" },
  { label: "Photography", value: "photography" },
  { label: "Character Design", value: "character-design" },
  { label: "Fashion", value: "fashion" },
  { label: "Architecture", value: "architecture" },
]

const ERAS = [
  { label: "1100s", value: "1100s", image: "/images/eras/1100s.jpg" },
  { label: "1200s", value: "1200s", image: "/images/eras/1200s.jpg" },
  { label: "1300s", value: "1300s", image: "/images/eras/1300s.jpg" },
  { label: "1400s", value: "1400s", image: "/images/eras/1400s.jpg" },
]

const TAGS: { [key: string]: string[] } = {
  Textures: ["Smooth", "Rough", "Glossy", "Matte"],
  Mediums: ["Oil", "Watercolor", "Acrylic", "Charcoal"],
  Colors: ["Red", "Blue", "Green", "Yellow"],
  Lighting: ["Natural Light", "Studio Lighting", "Dramatic Lighting", "Backlit"],
}

const SUBCATEGORIES = ["Eras", ...Object.keys(TAGS)]

export default function PromptSuggestions({
  open,
  onClose,
  onAddTags,
}: {
  open: boolean
  onClose: () => void
  onAddTags: (tags: string[]) => void
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [subcat, setSubcat] = useState(SUBCATEGORIES[0])
  const [selected, setSelected] = useState<string[]>([])

  // Filtered tags/images
  const getGrid = () => {
    if (subcat === "Eras") {
      return ERAS.filter(e => e.label.toLowerCase().includes(search.toLowerCase()))
    }
    return (TAGS[subcat] || []).filter((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  }

  const handleSelect = (val: string) => {
    setSelected(sel => sel.includes(val) ? sel.filter(s => s !== val) : [...sel, val])
  }

  return (
    <div className={`fixed inset-0 z-50 bg-black/60 flex items-center justify-center ${open ? '' : 'hidden'}`}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Prompt Suggestions</h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Search Keyword..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={cat.value === category ? "default" : "outline"}
              onClick={() => setCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mb-4 border-b pb-2 overflow-x-auto">
          {SUBCATEGORIES.map(sc => (
            <Button
              key={sc}
              variant={sc === subcat ? "default" : "outline"}
              onClick={() => setSubcat(sc)}
            >
              {sc}
            </Button>
          ))}
        </div>
        {/* Selected tags */}
        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selected.map(tag => (
              <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                {tag}
                <button onClick={() => handleSelect(tag)} className="ml-1 text-xs">✕</button>
              </span>
            ))}
          </div>
        )}
        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {subcat === "Eras"
            ? (getGrid() as typeof ERAS).map((era) => (
                <div
                  key={era.value}
                  className={`rounded-lg border cursor-pointer overflow-hidden ${selected.includes(era.label) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => handleSelect(era.label)}
                >
                  <img src={era.image} alt={era.label} className="w-full h-28 object-cover" />
                  <div className="text-center py-2 text-sm font-medium">{era.label}</div>
                </div>
              ))
            : (getGrid() as string[]).map((tag) => (
                <div
                  key={tag}
                  className={`rounded-lg border px-3 py-4 text-center cursor-pointer text-base font-medium ${selected.includes(tag) ? 'bg-blue-100 text-blue-800 border-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  onClick={() => handleSelect(tag)}
                >
                  {tag}
                </div>
              ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              onAddTags(selected)
              setSelected([])
              setSearch("")
              onClose()
            }}
            disabled={selected.length === 0}
          >
            Add to Prompt
          </Button>
        </div>
      </div>
    </div>
  )
} 