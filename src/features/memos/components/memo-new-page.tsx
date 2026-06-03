"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { TagInput } from "@/features/memos/components/tag-input"
import { toast } from "@/hooks/use-toast"
import { createMemo } from "@/features/memos/actions"
import type { Book } from "@/features/books/types"
import type { Tag } from "@/features/memos/types"

const memoCreateSchema = z.object({
  page_number: z.string().refine(
    v => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1),
    { message: "1以上の整数で入力してください" }
  ),
  content: z.string().min(1, "メモ内容は必須です").max(5000, "5000文字以内で入力してください"),
  tags: z.array(z.object({ id: z.string(), name: z.string() })),
  favorite: z.boolean(),
})

type FormValues = z.infer<typeof memoCreateSchema>

type Props = {
  book: Book
  tagSuggestions: Tag[]
}

export function MemoNewPage({ book, tagSuggestions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, control, watch, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(memoCreateSchema),
      defaultValues: {
        page_number: "",
        content: "",
        tags: [],
        favorite: false,
      },
    })

  const watchFavorite = watch("favorite")

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await createMemo({
        book_id: book.id,
        page_number: values.page_number ? Number(values.page_number) : null,
        content: values.content,
        tag_ids: values.tags.map(t => t.id),
        favorite: values.favorite,
      })

      if (result.error) {
        toast({ title: "登録エラー", description: result.error.message, variant: "destructive" })
        return
      }

      toast({ title: "メモを登録しました" })
      router.push(`/books/${book.id}`)
      router.refresh()
    })
  }

  return (
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
            メモを追加
          </span>
          {/* 右側スペース（見た目の均衡） */}
          <div className="h-9 w-9" />
        </div>
      </div>

      <main className="container mx-auto px-4 pt-24 pb-8">
        <p className="text-xs text-[#94a3b8] mb-6 truncate">{book.title}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ページ数 */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#cbd5e1]" htmlFor="page-number">
              ページ数
            </label>
            <Input
              id="page-number"
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
            <label className="text-sm text-[#cbd5e1]" htmlFor="content">
              メモ内容 <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="content"
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

          {/* 送信ボタン */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPending && <Spinner />}
              登録する
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
          </div>
        </form>
      </main>
    </div>
  )
}
