"use client"

import { useRouter } from "next/navigation"
import { FileText, Star } from "lucide-react"
import { StatusBadge } from "@/components/common/status-badge"
import type { Book } from "@/features/books/types"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
  })
}

interface HomeCompactBookRowProps {
  book: Book
}

export function HomeCompactBookRow({ book }: HomeCompactBookRowProps) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/books/${book.id}`)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
    >
      {/* タイトル・著者 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{book.title}</p>
        {book.author && (
          <p className="text-xs text-foreground-dim truncate">{book.author}</p>
        )}
      </div>

      {/* 読書状態バッジ */}
      <div className="shrink-0">
        <StatusBadge status={book.status} />
      </div>

      {/* メモ数・★ */}
      <div className="shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <FileText className="h-3 w-3" />
          {book.memoCount ?? 0}
        </span>
        <span className="flex items-center gap-0.5">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          {book.starCount ?? 0}
        </span>
      </div>

      {/* 更新月 */}
      <p className="shrink-0 text-xs text-foreground-dim hidden lg:block">
        {formatDate(book.updated_at)}
      </p>
    </div>
  )
}
