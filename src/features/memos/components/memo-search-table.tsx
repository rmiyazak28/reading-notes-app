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
  togglingIds: Set<string>
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

export function MemoSearchTable({ memos, togglingIds, onEdit, onToggleFavorite }: MemoSearchTableProps) {
  if (memos.length === 0) {
    return (
      <div className="glass rounded-lg p-8 text-center text-muted-foreground">
        メモが見つかりません
      </div>
    )
  }

  return (
    <div className="glass rounded-lg overflow-hidden">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="border-white/15 hover:bg-transparent">
            <TableHead className="text-muted-foreground bg-white/5 w-[26%] xl:w-[20%]">書籍名</TableHead>
            <TableHead className="text-muted-foreground bg-white/5 w-[8%] xl:w-[6%]">ページ</TableHead>
            <TableHead className="text-muted-foreground bg-white/5 w-[57%] xl:w-[40%]">メモ内容</TableHead>
            <TableHead className="text-muted-foreground bg-white/5 w-[18%] hidden xl:table-cell">タグ</TableHead>
            <TableHead className="text-muted-foreground bg-white/5 w-[8%] xl:w-[6%]">★</TableHead>
            <TableHead className="text-muted-foreground bg-white/5 w-[11%] hidden xl:table-cell">登録日 / 更新日</TableHead>
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
                <p className="text-foreground-secondary text-sm truncate">{memo.book_title}</p>
                {memo.book_author && (
                  <p className="text-foreground-dim text-xs truncate mt-0.5">{memo.book_author}</p>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {memo.page_number != null ? `p.${memo.page_number}` : "—"}
              </TableCell>
              <TableCell className="overflow-hidden max-w-0 whitespace-normal">
                <p className="text-foreground text-sm line-clamp-2">{memo.content}</p>
                <div className="flex flex-col gap-y-1 mt-1 xl:hidden">
                  <div className="flex flex-wrap gap-1">
                    {memo.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="text-[11px] bg-white/10 text-foreground-secondary px-1.5 py-0.5 rounded"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] text-foreground-dim">
                    登録: {formatDate(memo.created_at)} / 更新: {formatDate(memo.updated_at)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="overflow-hidden hidden xl:table-cell">
                <div className="flex flex-wrap gap-1">
                  {memo.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="text-xs bg-white/10 text-foreground-secondary px-1.5 py-0.5 rounded"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(memo) }}
                  disabled={togglingIds.has(memo.id)}
                  className="transition-colors"
                  aria-label={memo.favorite ? "お気に入り解除" : "お気に入りに追加"}
                >
                  <Star
                    className={`h-4 w-4 ${memo.favorite ? "text-amber-400 fill-amber-400" : "text-foreground-dim hover:text-amber-400"}`}
                  />
                </button>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <p className="text-foreground-secondary text-xs whitespace-nowrap">登録: {formatDate(memo.created_at)}</p>
                <p className="text-muted-foreground text-xs mt-0.5 whitespace-nowrap">更新: {formatDate(memo.updated_at)}</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
