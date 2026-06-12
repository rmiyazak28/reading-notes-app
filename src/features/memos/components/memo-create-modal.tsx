"use client"

import { useEffect } from "react"
import { Controller } from "react-hook-form"
import { Star } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { TagInput } from "@/features/memos/components/tag-input"
import { useMemoCreateForm } from "@/features/memos/hooks/use-memo-form"
import type { MemoWithTags, Tag } from "@/features/memos/types"

type Props = {
  bookId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (memo: MemoWithTags) => void
  tagSuggestions: Tag[]
}

export function MemoCreateModal({ bookId, open, onOpenChange, onSuccess, tagSuggestions }: Props) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watchFavorite,
    isPending,
    onSubmit,
    defaultCreateValues,
  } = useMemoCreateForm({
    bookId,
    onSuccess: (memo) => {
      onSuccess(memo)
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) {
      reset(defaultCreateValues)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass bg-slate-900/95 border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">メモを追加</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* ページ数 */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground-secondary" htmlFor="create-page-number">
              ページ数
            </label>
            <Input
              id="create-page-number"
              type="number"
              min={1}
              placeholder="例: 42"
              className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
              {...register("page_number")}
            />
            {errors.page_number && (
              <p className="text-sm text-destructive">{errors.page_number.message}</p>
            )}
          </div>

          {/* メモ内容 */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground-secondary" htmlFor="create-content">
              メモ内容 <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="create-content"
              rows={5}
              placeholder="読書メモを入力..."
              className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors resize-none max-h-48 overflow-y-auto"
              {...register("content")}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* タグ */}
          <div className="space-y-1.5">
            <label className="text-sm text-foreground-secondary">タグ</label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  selected={field.value}
                  suggestions={tagSuggestions}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* お気に入り */}
          <Controller
            control={control}
            name="favorite"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
              >
                <Star
                  className={`h-4 w-4 transition-colors ${
                    watchFavorite ? "text-amber-400 fill-amber-400" : "text-foreground-dim"
                  }`}
                />
                お気に入りに追加
              </button>
            )}
          />

          {/* アクションボタン */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-white/10"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPending && <Spinner />}
              登録
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
