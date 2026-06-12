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

interface HomeBookCardProps {
  book: Book
}

export function HomeBookCard({ book }: HomeBookCardProps) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/books/${book.id}`)}
      className="glass glass-hover rounded-lg p-4 cursor-pointer flex-shrink-0 w-52 flex flex-col gap-2"
    >
      <p className="font-medium text-foreground text-sm line-clamp-2 leading-snug">{book.title}</p>
      {book.author && (
        <p className="text-xs text-muted-foreground truncate">{book.author}</p>
      )}
      <StatusBadge status={book.status} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {book.memoCount ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          {book.starCount ?? 0}
        </span>
        <span className="ml-auto">{formatDate(book.updated_at)}</span>
      </div>
    </div>
  )
}
