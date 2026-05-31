"use client"

import { Edit3, FileText, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/status-badge"
import type { Book } from "@/features/books/types"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

interface BookDetailHeaderProps {
  book: Book
  onEdit: () => void
}

export function BookDetailHeader({ book, onEdit }: BookDetailHeaderProps) {
  return (
    <div className="glass rounded-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#f1f5f9] break-words">{book.title}</h1>
          {book.author && (
            <p className="text-[#94a3b8] mt-1">{book.author}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="shrink-0 text-[#94a3b8] hover:text-foreground hover:bg-white/10 gap-1.5"
        >
          <Edit3 className="h-4 w-4" />
          <span className="hidden sm:inline">編集</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-[#cbd5e1]">
        {book.genre && <span>ジャンル: {book.genre}</span>}
        <StatusBadge status={book.status} />
        <span>登録日: {formatDate(book.created_at)}</span>
        {book.completed_at && (
          <span>読了日: {formatDate(book.completed_at)}</span>
        )}
      </div>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-[#cbd5e1]">
          <FileText className="h-4 w-4" />
          <span className="text-sm">メモ {book.memoCount ?? 0} 件</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#cbd5e1]">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span className="text-sm">★重要 {book.starCount ?? 0} 件</span>
        </div>
      </div>
    </div>
  )
}
