"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Star } from "lucide-react"
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
import type { Book } from "@/features/books/types"
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
  memo: MemoWithTags
  book: Book
  tagSuggestions: Tag[]
  backTo: string
}

export function MemoEditPage({ memo, book, tagSuggestions, backTo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const { register, handleSubmit, control, watch, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(memoEditSchema),
      defaultValues: {
        page_number: memo.page_number != null ? String(memo.page_number) : "",
        content: memo.content,
        tags: memo.tags,
        favorite: memo.favorite,
      },
    })

  const watchFavorite = watch("favorite")

  const onSubmit = (values: FormValues) => {
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
      router.replace(backTo)
    })
  }

  const handleDelete = () => {
    setIsDeleteConfirmOpen(false)
    startTransition(async () => {
      const result = await deleteMemo(memo.id)
      if (result.error) {
        toast({ title: "削除エラー", description: result.error.message, variant: "destructive" })
        return
      }
      toast({ title: "メモを削除しました" })
      router.replace(backTo)
    })
  }

  return (
    <>
      <div className="min-h-screen">
        {/* スマホヘッダー（グローバルヘッダーを上書き） */}
        <div className="fixed top-0 inset-x-0 h-16 z-[60] glass border-b border-white/10">
          <div className="flex items-center justify-between h-full px-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center h-9 w-9 rounded-lg text-foreground hover:bg-white/10 transition-colors"
              aria-label="戻る"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-foreground truncate px-3">
              メモを編集
            </span>
            <div className="h-9 w-9" />
          </div>
        </div>

        <main className="container mx-auto px-4 pt-24 pb-8">
          <p className="text-xs text-muted-foreground mb-6 truncate">{book.title}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* ページ数 */}
            <div className="space-y-1.5">
              <label className="text-sm text-foreground-secondary" htmlFor="edit-page-number">
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
              <label className="text-sm text-foreground-secondary" htmlFor="edit-content">
                メモ内容 <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="edit-content"
                rows={8}
                placeholder="読書メモを入力..."
                className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors resize-none max-h-64 overflow-y-auto"
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
                  aria-label="お気に入り切替"
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

            {/* ボタン */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPending && <Spinner />}
                更新する
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => router.back()}
                className="w-full text-muted-foreground hover:text-foreground hover:bg-white/10"
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                削除する
              </Button>
            </div>
          </form>
        </main>
      </div>

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
