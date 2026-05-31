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
          aria-label="書籍を編集"
          className="shrink-0 text-[#94a3b8] hover:text-foreground hover:bg-white/10 gap-1.5"
        >
          <Edit3 className="h-4 w-4" />
          <span className="hidden sm:inline">編集</span>
        </Button>
      </div>

      {/* PC: 2カラムグリッド（ジャンル|読書状態、登録日|読了日） */}
      <div className="hidden md:grid grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm text-[#cbd5e1]">
        <span>{book.genre ? `ジャンル: ${book.genre}` : ""}</span>
        <span className="flex items-center gap-2">
          読書状態: <StatusBadge status={book.status} />
        </span>
        <span>登録日: {formatDate(book.created_at)}</span>
        <span>{book.completed_at ? `読了日: ${formatDate(book.completed_at)}` : ""}</span>
      </div>

      {/* スマホ: 縦並び */}
      <div className="md:hidden flex flex-col gap-2 mt-4 text-sm text-[#cbd5e1]">
        {book.genre && <span>ジャンル: {book.genre}</span>}
        <span className="flex items-center gap-2">
          読書状態: <StatusBadge status={book.status} />
        </span>
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
          <span className="text-sm">お気に入り {book.starCount ?? 0} 件</span>
        </div>
      </div>
    </div>
  )
}
