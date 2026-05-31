"use client"

import { useState, useTransition } from "react"
import { Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { toggleFavorite, deleteMemo } from "@/features/memos/actions"
import type { MemoWithTags } from "@/features/memos/types"

interface MemoTableProps {
  memos: MemoWithTags[]
  onToggleFavorite: (memoId: string, newFavorite: boolean) => void
  onDelete: (memoId: string) => void
  onEdit?: (memo: MemoWithTags) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function MemoTable({ memos, onToggleFavorite, onDelete, onEdit }: MemoTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleToggleFavorite = (memo: MemoWithTags) => {
    startTransition(async () => {
      const result = await toggleFavorite(memo.id)
      if (result.error) {
        toast({ title: "エラー", description: result.error.message, variant: "destructive" })
        return
      }
      onToggleFavorite(memo.id, result.data.favorite)
    })
  }

  const handleDelete = () => {
    if (!deletingId) return
    const id = deletingId
    setDeletingId(null)
    startTransition(async () => {
      const result = await deleteMemo(id)
      if (result.error) {
        toast({ title: "削除エラー", description: result.error.message, variant: "destructive" })
        return
      }
      toast({ title: "メモを削除しました" })
      onDelete(id)
    })
  }

  if (memos.length === 0) {
    return (
      <div className="glass rounded-lg p-8 text-center text-[#94a3b8]">
        メモはまだありません
      </div>
    )
  }

  return (
    <>
      <div className="glass rounded-lg overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="border-white/15 hover:bg-transparent">
              <TableHead className="text-[#94a3b8] bg-white/5 w-[8%]">ページ</TableHead>
              <TableHead className="text-[#94a3b8] bg-white/5 w-[44%]">内容</TableHead>
              <TableHead className="text-[#94a3b8] bg-white/5 w-[21%]">タグ</TableHead>
              <TableHead className="text-[#94a3b8] bg-white/5 w-[7%]">★</TableHead>
              <TableHead className="text-[#94a3b8] bg-white/5 w-[12%]">登録日</TableHead>
              <TableHead className="text-[#94a3b8] bg-white/5 w-[8%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memos.map((memo) => (
              <TableRow
                key={memo.id}
                className="border-white/15 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => onEdit?.(memo)}
              >
                <TableCell className="text-[#cbd5e1] text-sm">
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
                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(memo) }}
                    disabled={isPending}
                    className="transition-colors"
                    aria-label={memo.favorite ? "お気に入り解除" : "お気に入りに追加"}
                  >
                    <Star
                      className={`h-4 w-4 ${memo.favorite ? "text-amber-400 fill-amber-400" : "text-[#64748b] hover:text-amber-400"}`}
                    />
                  </button>
                </TableCell>
                <TableCell className="text-[#cbd5e1] text-sm">
                  {formatDate(memo.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setDeletingId(memo.id) }}
                    className="h-7 w-7 text-[#64748b] hover:text-destructive hover:bg-destructive/10"
                    aria-label="メモを削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="glass bg-slate-900/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">メモを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-foreground hover:bg-white/10">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
