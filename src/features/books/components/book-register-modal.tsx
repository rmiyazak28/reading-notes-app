"use client"

import { useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/hooks/use-toast"
import { createBook } from "@/features/books/actions"
import type { Book } from "@/features/books/types"

const bookRegisterSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルは必須です")
    .max(255, "255文字以内で入力してください"),
  author: z
    .string()
    .max(255, "255文字以内で入力してください"),
  genre: z
    .string()
    .max(100, "100文字以内で入力してください"),
  status: z.enum(["unread", "reading", "completed"]),
})

type BookRegisterFormValues = z.infer<typeof bookRegisterSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (book: Book) => void
}

export function BookRegisterModal({ open, onOpenChange, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<BookRegisterFormValues>({
    resolver: zodResolver(bookRegisterSchema),
    defaultValues: {
      title: "",
      author: "",
      genre: "",
      status: "unread",
    },
  })

  const onSubmit = (values: BookRegisterFormValues) => {
    startTransition(async () => {
      const result = await createBook({
        title: values.title,
        author: values.author || null,
        genre: values.genre || null,
        status: values.status,
      })

      if (result.error) {
        toast({
          title: "登録エラー",
          description: result.error.message,
          variant: "destructive",
        })
        return
      }

      toast({ title: "書籍を登録しました" })
      onSuccess(result.data)
      onOpenChange(false)
      reset()
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass bg-slate-900/95 border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">書籍を登録</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* タイトル */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#cbd5e1]" htmlFor="title">
              タイトル <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              placeholder="例：リーダブルコード"
              className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* 著者 */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#cbd5e1]" htmlFor="author">
              著者
            </label>
            <Input
              id="author"
              placeholder="例：Dustin Boswell"
              className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
              {...register("author")}
            />
            {errors.author && (
              <p className="text-sm text-destructive">{errors.author.message}</p>
            )}
          </div>

          {/* ジャンル */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#cbd5e1]" htmlFor="genre">
              ジャンル
            </label>
            <Input
              id="genre"
              placeholder="例：IT・プログラミング"
              className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
              {...register("genre")}
            />
            {errors.genre && (
              <p className="text-sm text-destructive">{errors.genre.message}</p>
            )}
          </div>

          {/* 読書状態 */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#cbd5e1]">読書状態</label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="glass border-white/10 bg-white/5 text-foreground focus:ring-primary/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass bg-slate-900/95 border-white/10">
                    <SelectItem value="unread" className="text-foreground focus:bg-white/10">
                      未読
                    </SelectItem>
                    <SelectItem value="reading" className="text-foreground focus:bg-white/10">
                      読書中
                    </SelectItem>
                    <SelectItem value="completed" className="text-foreground focus:bg-white/10">
                      読了
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
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
