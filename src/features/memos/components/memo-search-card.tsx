"use client"

import { Star } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import type { MemoWithBook } from "@/features/memos/types"

interface MemoSearchCardProps {
  memo: MemoWithBook
  togglingIds: Set<string>
  sortBy: "created_at" | "updated_at"
  onToggleFavorite: (memo: MemoWithBook) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
}

function MemoSearchCard({ memo, togglingIds, sortBy, onToggleFavorite }: MemoSearchCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <div
      className="glass rounded-lg p-4 cursor-pointer glass-hover"
      onClick={() => {
        const currentSearch = searchParams.toString()
        const backPath = currentSearch ? `/memos?${currentSearch}` : "/memos"
        router.push(`/memos/${memo.id}/edit?from=${encodeURIComponent(backPath)}`)
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate flex-1">{memo.book_title}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(memo) }}
          disabled={togglingIds.has(memo.id)}
          className="transition-colors shrink-0"
          aria-label={memo.favorite ? "お気に入り解除" : "お気に入りに追加"}
        >
          <Star
            className={`h-4 w-4 ${memo.favorite ? "text-amber-400 fill-amber-400" : "text-foreground-dim"}`}
          />
        </button>
      </div>

      <p className="text-foreground text-sm mt-2 line-clamp-3">{memo.content}</p>

      {memo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {memo.tags.map(tag => (
            <span key={tag.id} className="text-xs bg-white/10 text-foreground-secondary px-1.5 py-0.5 rounded">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground-dim mt-3">
        {sortBy === "created_at" ? `登録: ${formatDate(memo.created_at)}` : `更新: ${formatDate(memo.updated_at)}`}
      </p>
    </div>
  )
}

interface MemoSearchCardListProps {
  memos: MemoWithBook[]
  togglingIds: Set<string>
  sortBy: "created_at" | "updated_at"
  onToggleFavorite: (memo: MemoWithBook) => void
}

export function MemoSearchCardList({ memos, togglingIds, sortBy, onToggleFavorite }: MemoSearchCardListProps) {
  if (memos.length === 0) {
    return (
      <div className="glass rounded-lg p-8 text-center text-muted-foreground">
        メモが見つかりません
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {memos.map(memo => (
        <MemoSearchCard
          key={memo.id}
          memo={memo}
          togglingIds={togglingIds}
          sortBy={sortBy}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}
