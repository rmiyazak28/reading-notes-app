"use client"

import { useRouter } from "next/navigation"
import type { Book } from "@/features/books/types"
import { StatusBadge } from "@/components/common/status-badge"
import { FileText, Star } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BookTableProps {
  books: Book[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function BookTable({ books }: BookTableProps) {
  const router = useRouter()

  return (
    <div className="glass rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/15 hover:bg-transparent">
            <TableHead className="text-[#94a3b8] bg-white/5">タイトル</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5">著者</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5">ジャンル</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5">読書状態</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5 text-center">メモ数</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5">★メモ</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5">更新日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => (
            <TableRow
              key={book.id}
              className="border-white/15 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => router.push(`/books/${book.id}`)}
            >
              <TableCell className="font-medium text-[#f1f5f9]">
                {book.title}
              </TableCell>
              <TableCell className="text-[#cbd5e1]">
                {book.author}
              </TableCell>
              <TableCell className="text-[#cbd5e1]">
                {book.genre}
              </TableCell>
              <TableCell>
                <StatusBadge status={book.status} />
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#cbd5e1]">
                  <FileText className="h-4 w-4" />
                  <span>{book.memoCount}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-[#cbd5e1]">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span>{book.starCount}</span>
                </div>
              </TableCell>
              <TableCell className="text-[#cbd5e1]">
                {formatDate(book.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
