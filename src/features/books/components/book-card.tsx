"use client"

import { useRouter } from "next/navigation"
import type { Book } from "@/features/books/types"
import { StatusBadge } from "@/components/common/status-badge"
import { FileText, Star } from "lucide-react"

interface BookCardProps {
  book: Book
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function BookCard({ book }: BookCardProps) {
  const router = useRouter()

  return (
    <div
      className="glass rounded-lg p-4 glass-hover cursor-pointer"
      onClick={() => router.push(`/books/${book.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[#f1f5f9] truncate">
            {book.title}
          </h3>
          <p className="text-sm text-[#cbd5e1] mt-0.5">
            {book.author}
          </p>
        </div>
        <StatusBadge status={book.status} />
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm">
        <span className="text-[#cbd5e1]">{book.genre}</span>
        <div className="flex items-center gap-1 text-[#cbd5e1]">
          <FileText className="h-3.5 w-3.5" />
          <span>{book.memoCount}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/15">
        <div className="flex items-center gap-1 text-[#cbd5e1]">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span>{book.starCount}</span>
        </div>
        <span className="text-xs text-[#cbd5e1]">
          {formatDate(book.updated_at)}
        </span>
      </div>
    </div>
  )
}

interface BookCardListProps {
  books: Book[]
}

export function BookCardList({ books }: BookCardListProps) {
  return (
    <div className="grid gap-4">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}
