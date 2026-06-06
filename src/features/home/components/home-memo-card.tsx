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

interface HomeMemoCardProps {
  memo: HomeMemoWithBook
  onEdit?: () => void
  onFavoriteClick: () => void
  isPending: boolean
}

export function HomeMemoCard({ memo, onEdit, onFavoriteClick, isPending }: HomeMemoCardProps) {
  return (
    <div
      onClick={onEdit}
      className="glass glass-hover rounded-lg p-4 cursor-pointer flex-shrink-0 w-64 flex flex-col gap-2"
    >
      {/* 書籍名 */}
      <Link
        href={`/books/${memo.book.id}`}
        onClick={(e) => e.stopPropagation()}
        className="text-xs text-primary hover:underline truncate"
      >
        {memo.book.title}
      </Link>

      {/* ページ数 + お気に入り */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#94a3b8]">
          {memo.page_number != null ? `p.${memo.page_number}` : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onFavoriteClick() }}
          disabled={isPending}
          className="transition-colors shrink-0"
          aria-label={memo.favorite ? "お気に入り解除" : "お気に入りに追加"}
        >
          <Star
            className={`h-3.5 w-3.5 ${memo.favorite ? "text-amber-400 fill-amber-400" : "text-[#64748b]"}`}
          />
        </button>
      </div>

      {/* メモ内容 */}
      <p className="text-[#f1f5f9] text-sm line-clamp-3 leading-snug">{memo.content}</p>

      {/* タグ */}
      {memo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {memo.tags.map((tag) => (
            <span key={tag.id} className="text-xs bg-white/10 text-[#cbd5e1] px-1.5 py-0.5 rounded">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* 登録日 */}
      <p className="text-xs text-[#94a3b8] mt-auto pt-1">{formatDate(memo.created_at)}</p>
    </div>
  )
}
