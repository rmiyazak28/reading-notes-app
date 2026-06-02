"use client"

import { useState, useRef, useTransition } from "react"
import { X, Plus, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createTag } from "@/features/memos/actions"
import type { Tag } from "@/features/memos/types"

type Props = {
  selected: Tag[]
  suggestions: Tag[]
  onChange: (tags: Tag[]) => void
}

export function TagInput({ selected, suggestions, onChange }: Props) {
  const [inputValue, setInputValue] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, startCreateTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = inputValue.trim()
  const selectedIds = new Set(selected.map(t => t.id))

  const filtered = suggestions.filter(
    t => !selectedIds.has(t.id) && t.name.toLowerCase().includes(trimmed.toLowerCase())
  )

  const canCreate =
    trimmed.length > 0 &&
    trimmed.length <= 50 &&
    !suggestions.some(t => t.name.toLowerCase() === trimmed.toLowerCase())

  const addTag = (tag: Tag) => {
    if (selectedIds.has(tag.id)) return
    onChange([...selected, tag])
    setInputValue("")
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const removeTag = (id: string) => {
    onChange(selected.filter(t => t.id !== id))
  }

  const handleCreate = () => {
    if (!trimmed) return
    startCreateTransition(async () => {
      const result = await createTag(trimmed)
      if (result.error) {
        toast({ title: "タグ作成エラー", description: result.error.message, variant: "destructive" })
        return
      }
      addTag(result.data)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      // 候補が1件だけならそれを選択、なければ新規作成
      if (filtered.length === 1) {
        addTag(filtered[0])
      } else if (canCreate) {
        handleCreate()
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false)
    }
    if (e.key === "Backspace" && !inputValue && selected.length > 0) {
      removeTag(selected[selected.length - 1].id)
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary border border-primary/30 rounded px-1.5 py-0.5"
          >
            #{tag.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag.id) }}
              className="hover:text-destructive transition-colors"
              aria-label={`${tag.name}を削除`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? "タグを入力..." : ""}
          className="flex-1 min-w-24 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {isCreating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />}
      </div>

      {isOpen && (filtered.length > 0 || canCreate) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-white/10 bg-slate-900/95 shadow-lg overflow-hidden">
          {filtered.map(tag => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); addTag(tag) }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-white/10 transition-colors"
            >
              #{tag.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleCreate() }}
              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              「{trimmed}」を作成
            </button>
          )}
        </div>
      )}
    </div>
  )
}
