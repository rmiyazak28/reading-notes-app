"use client"

import { useState, useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
  AlertDialogTitle as AlertTitle,
} from "@/components/ui/alert-dialog"
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
import { updateBook, deleteBook } from "@/features/books/actions"
import type { Book } from "@/features/books/types"

const bookEditSchema = z
  .object({
    title: z
      .string()
      .min(1, "タイトルは必須です")
      .max(255, "255文字以内で入力してください"),
    author: z.string().max(255, "255文字以内で入力してください"),
    genre: z.string().max(100, "100文字以内で入力してください"),
    status: z.enum(["unread", "reading", "completed"]),
    completed_at: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "completed" && !data.completed_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completed_at"],
        message: "読了日は必須です",
      })
    }
  })

type BookEditFormValues = z.infer<typeof bookEditSchema>

type Props = {
  book: Book
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (book: Book) => void
  onDelete: () => void
}

export function BookEditModal({ book, open, onOpenChange, onSuccess, onDelete }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const todayStr = new Date().toISOString().split("T")[0]

  const { register, handleSubmit, control, watch, formState: { errors } } =
    useForm<BookEditFormValues>({
      resolver: zodResolver(bookEditSchema),
      // values でなく defaultValues を使うと book prop 変化時に再初期化されないため values を使用
      values: {
        title: book.title,
        author: book.author ?? "",
        genre: book.genre ?? "",
        status: book.status,
        completed_at: book.completed_at ?? todayStr,
      },
    })

  const watchStatus = watch("status")

  const onSubmit = (values: BookEditFormValues) => {
    startTransition(async () => {
      const result = await updateBook(book.id, {
        title: values.title,
        author: values.author || null,
        genre: values.genre || null,
        status: values.status,
        completed_at: values.status === "completed" ? (values.completed_at || null) : null,
      })

      if (result.error) {
        toast({ title: "更新エラー", description: result.error.message, variant: "destructive" })
        return
      }

      toast({ title: "書籍情報を更新しました" })
      onSuccess(result.data)
      onOpenChange(false)
    })
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteBook(book.id)
      if (result.error) {
        toast({ title: "削除エラー", description: result.error.message, variant: "destructive" })
        return
      }
      toast({ title: "書籍を削除しました" })
      setIsDeleteDialogOpen(false)
      onOpenChange(false)
      onDelete()
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass bg-slate-900/95 border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">書籍を編集</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* タイトル */}
            <div className="space-y-1.5">
              <label className="text-sm text-[#cbd5e1]" htmlFor="edit-title">
                タイトル <span className="text-destructive">*</span>
              </label>
              <Input
                id="edit-title"
                className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* 著者 */}
            <div className="space-y-1.5">
              <label className="text-sm text-[#cbd5e1]" htmlFor="edit-author">著者</label>
              <Input
                id="edit-author"
                className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
                {...register("author")}
              />
              {errors.author && (
                <p className="text-sm text-destructive">{errors.author.message}</p>
              )}
            </div>

            {/* ジャンル */}
            <div className="space-y-1.5">
              <label className="text-sm text-[#cbd5e1]" htmlFor="edit-genre">ジャンル</label>
              <Input
                id="edit-genre"
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
                      <SelectItem value="unread" className="text-foreground focus:bg-white/10">未読</SelectItem>
                      <SelectItem value="reading" className="text-foreground focus:bg-white/10">読書中</SelectItem>
                      <SelectItem value="completed" className="text-foreground focus:bg-white/10">読了</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* 読了日 */}
            <div className="space-y-1.5">
              <label className="text-sm text-[#cbd5e1]" htmlFor="edit-completed-at">
                読了日
                {watchStatus === "completed" && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>
              <input
                id="edit-completed-at"
                type="date"
                className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10"
                {...register("completed_at")}
              />
              {errors.completed_at && (
                <p className="text-sm text-destructive">{errors.completed_at.message}</p>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending || isDeletePending}
                onClick={() => setIsDeleteDialogOpen(true)}
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

      {/* 削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass bg-slate-900/95 border-white/10">
          <AlertDialogHeader>
            <AlertTitle className="text-foreground">書籍を削除しますか？</AlertTitle>
            <AlertDialogDescription>
              「{book.title}」とすべての関連メモが削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 bg-white/5 text-foreground hover:bg-white/10"
              disabled={isDeletePending}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeletePending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletePending && <Spinner />}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
