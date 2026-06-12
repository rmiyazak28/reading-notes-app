"use client"

import Link from "next/link"
import { Star } from "lucide-react"
import type { HomeMemoWithBook } from "@/features/home/actions"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

interface HomeCompactMemoRowProps {
  memo: HomeMemoWithBook
  onEdit?: () => void
  onFavoriteClick: () => void
  isPending: boolean
  /** PC全幅セクション（お気に入りメモ）では本文を複数行表示する */
  multiLine?: boolean
}

export function HomeCompactMemoRow({ memo, onEdit, onFavoriteClick, isPending, multiLine }: HomeCompactMemoRowProps) {
  return (
    <div
      onClick={onEdit}
      className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
    >
      {/* 書籍名：10px・薄い色 */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/books/${memo.book.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-foreground-dim hover:text-muted-foreground truncate transition-colors"
        >
          {memo.book.title}
        </Link>
        <span className="shrink-0 text-[10px] text-foreground-dim">{formatDate(memo.created_at)}</span>
      </div>

      {/* メモ内容・タグ・お気に入り */}
      <div className={`flex gap-2 ${multiLine ? "items-start" : "items-center"}`}>
        <p className={`flex-1 min-w-0 text-sm text-foreground ${multiLine ? "line-clamp-3" : "truncate"}`}>{memo.content}</p>

        {/* タグ（最大2件） */}
        <div className="shrink-0 flex items-center gap-1">
          {memo.tags.slice(0, 2).map((tag) => (
            <span key={tag.id} className="text-xs bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded">
              #{tag.name}
            </span>
          ))}
        </div>

        {/* お気に入りアイコン */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavoriteClick() }}
          disabled={isPending}
          className="shrink-0 transition-colors"
          aria-label={memo.favorite ? "お気に入り解除" : "お気に入りに追加"}
        >
          <Star
            className={`h-3.5 w-3.5 ${memo.favorite ? "text-amber-400 fill-amber-400" : "text-foreground-dim"}`}
          />
        </button>
      </div>
    </div>
  )
}
