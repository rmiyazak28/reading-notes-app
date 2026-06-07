"use client"

import { Star } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { MemoWithBook } from "@/features/memos/types"

interface MemoSearchTableProps {
  memos: MemoWithBook[]
  isPending: boolean
  onEdit: (memo: MemoWithBook) => void
  onToggleFavorite: (memo: MemoWithBook) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function MemoSearchTable({ memos, isPending, onEdit, onToggleFavorite }: MemoSearchTableProps) {
  if (memos.length === 0) {
    return (
      <div className="glass rounded-lg p-8 text-center text-[#94a3b8]">
        メモが見つかりません
      </div>
    )
  }

  return (
    <div className="glass rounded-lg overflow-hidden">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="border-white/15 hover:bg-transparent">
            <TableHead className="text-[#94a3b8] bg-white/5 w-[20%]">書籍名</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5 w-[6%]">ページ</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5 w-[40%]">メモ内容</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5 w-[18%]">タグ</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5 w-[6%]">★</TableHead>
            <TableHead className="text-[#94a3b8] bg-white/5 w-[10%]">登録日 / 更新日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memos.map((memo) => (
            <TableRow
              key={memo.id}
              className="border-white/15 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => onEdit(memo)}
            >
              <TableCell className="overflow-hidden max-w-0">
                <p className="text-[#cbd5e1] text-sm truncate">{memo.book_title}</p>
                {memo.book_author && (
                  <p className="text-[#64748b] text-xs truncate mt-0.5">{memo.book_author}</p>
                )}
              </TableCell>
              <TableCell className="text-[#94a3b8] text-sm">
                {memo.page_number != null ? `p.${memo.page_number}` : "—"}
              </TableCell>
              <TableCell className="overflow-hidden max-w-0 whitespace-normal">
                <p className="text-[#f1f5f9] text-sm line-clamp-2">{memo.content}</p>
              </TableCell>
              <TableCell className="overflow-hidden">
                <div className="flex flex-wrap gap-1">
                  {memo.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="text-xs bg-white/10 text-[#cbd5e1] px-1.5 py-0.5 rounded"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(memo) }}
                  disabled={isPending}
                  className="transition-colors"
                  aria-label={memo.favorite ? "お気に入り解除" : "お気に入りに追加"}
                >
                  <Star
                    className={`h-4 w-4 ${memo.favorite ? "text-amber-400 fill-amber-400" : "text-[#64748b] hover:text-amber-400"}`}
                  />
                </button>
              </TableCell>
              <TableCell>
                <p className="text-[#cbd5e1] text-xs">登録: {formatDate(memo.created_at)}</p>
                <p className="text-[#94a3b8] text-xs mt-0.5">更新: {formatDate(memo.updated_at)}</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
