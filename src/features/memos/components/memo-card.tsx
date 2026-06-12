"use client"

import { useState, useTransition } from "react"
import { Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

interface MemoCardProps {
  memo: MemoWithTags
  onToggleFavorite: (memoId: string, newFavorite: boolean) => void
  onDelete: (memoId: string) => void
  onEdit?: (memo: MemoWithTags) => void
  isPending: boolean
  onFavoriteClick: () => void
  onDeleteClick: () => void
}

function MemoCard({ memo, onEdit, isPending, onFavoriteClick, onDeleteClick }: MemoCardProps) {
  return (
    <div
      className="glass rounded-lg p-4 glass-hover cursor-pointer"
      onClick={() => onEdit?.(memo)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {memo.page_number != null ? `p.${memo.page_number}` : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onFavoriteClick() }}
          disabled={isPending}
          className="transition-colors shrink-0"
          aria-label={memo.favorite ? "お気に入り解除" : "お気に入りに追加"}
        >
          <Star
            className={`h-4 w-4 ${memo.favorite ? "text-amber-400 fill-amber-400" : "text-foreground-dim"}`}
          />
        </button>
      </div>

      <p className="text-foreground text-sm mt-2 line-clamp-3">{memo.content}</p>

      {memo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {memo.tags.map(tag => (
            <span key={tag.id} className="text-xs bg-white/10 text-foreground-secondary px-1.5 py-0.5 rounded">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <span className="text-xs text-muted-foreground">{formatDate(memo.created_at)}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onDeleteClick() }}
          className="h-7 w-7 text-foreground-dim hover:text-destructive hover:bg-destructive/10"
          aria-label="メモを削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface MemoCardListProps {
  memos: MemoWithTags[]
  onToggleFavorite: (memoId: string, newFavorite: boolean) => void
  onDelete: (memoId: string) => void
  onEdit?: (memo: MemoWithTags) => void
}

export function MemoCardList({ memos, onToggleFavorite, onDelete, onEdit }: MemoCardListProps) {
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
      <div className="glass rounded-lg p-8 text-center text-muted-foreground">
        メモはまだありません
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {memos.map((memo) => (
          <MemoCard
            key={memo.id}
            memo={memo}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
            onEdit={onEdit}
            isPending={isPending}
            onFavoriteClick={() => handleToggleFavorite(memo)}
            onDeleteClick={() => setDeletingId(memo.id)}
          />
        ))}
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
