"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Star } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { TagInput } from "@/features/memos/components/tag-input"
import { toast } from "@/hooks/use-toast"
import { updateMemo, deleteMemo } from "@/features/memos/actions"
import type { MemoWithTags, Tag } from "@/features/memos/types"

const memoEditSchema = z.object({
  page_number: z.string().refine(
    v => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1),
    { message: "1以上の整数で入力してください" }
  ),
  content: z.string().min(1, "メモ内容は必須です").max(5000, "5000文字以内で入力してください"),
  tags: z.array(z.object({ id: z.string().optional(), name: z.string() })),
  favorite: z.boolean(),
})

type FormValues = z.infer<typeof memoEditSchema>

type Props = {
  memo: MemoWithTags | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (memo: MemoWithTags) => void
  onDelete: (memoId: string) => void
  tagSuggestions: Tag[]
}

export function MemoEditModal({ memo, open, onOpenChange, onSuccess, onDelete, tagSuggestions }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const { register, handleSubmit, control, watch, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(memoEditSchema),
      defaultValues: {
        page_number: "",
        content: "",
        tags: [],
        favorite: false,
      },
    })

  useEffect(() => {
    if (open && memo) {
      reset({
        page_number: memo.page_number != null ? String(memo.page_number) : "",
        content: memo.content,
        tags: memo.tags,
        favorite: memo.favorite,
      })
    }
    if (!open) {
      reset({ page_number: "", content: "", tags: [], favorite: false })
    }
  }, [open, memo]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchFavorite = watch("favorite")

  const onSubmit = (values: FormValues) => {
    if (!memo) return
    startTransition(async () => {
      const result = await updateMemo(memo.id, {
        page_number: values.page_number ? Number(values.page_number) : null,
        content: values.content,
        tags: values.tags,
        favorite: values.favorite,
      })

      if (result.error) {
        toast({ title: "更新エラー", description: result.error.message, variant: "destructive" })
        return
      }

      toast({ title: "メモを更新しました" })
      onSuccess(result.data)
      onOpenChange(false)
    })
  }

  const handleDelete = () => {
    if (!memo) return
    const id = memo.id
    setIsDeleteConfirmOpen(false)
    startTransition(async () => {
      const result = await deleteMemo(id)
      if (result.error) {
        toast({ title: "削除エラー", description: result.error.message, variant: "destructive" })
        return
      }
      toast({ title: "メモを削除しました" })
      onDelete(id)
      onOpenChange(false)
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass bg-slate-900/95 border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">メモを編集</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* ページ数 */}
            <div className="space-y-1.5">
              <label className="text-sm text-[#cbd5e1]" htmlFor="edit-page-number">
                ページ数
              </label>
              <Input
                id="edit-page-number"
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
              <label className="text-sm text-[#cbd5e1]" htmlFor="edit-content">
                メモ内容 <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="edit-content"
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
              <label className="text-sm text-[#cbd5e1]">タグ</label>
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
                  aria-label="お気に入り切替"
                  className="flex items-center gap-2 text-sm text-[#cbd5e1] hover:text-foreground transition-colors"
                >
                  <Star
                    className={`h-4 w-4 transition-colors ${
                      watchFavorite ? "text-amber-400 fill-amber-400" : "text-[#64748b]"
                    }`}
                  />
                  お気に入りに追加
                </button>
              )}
            />

            {/* アクションボタン */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                削除
              </Button>
              <div className="flex gap-3">
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
                  更新
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
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
