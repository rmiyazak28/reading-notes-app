import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "@/hooks/use-toast"
import { createMemo, updateMemo, deleteMemo } from "@/features/memos/actions"
import type { MemoWithTags } from "@/features/memos/types"

const memoFormSchema = z.object({
  page_number: z.string().refine(
    v => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1),
    { message: "1以上の整数で入力してください" }
  ),
  content: z.string().min(1, "メモ内容は必須です").max(5000, "5000文字以内で入力してください"),
  tags: z.array(z.object({ id: z.string().optional(), name: z.string() })),
  favorite: z.boolean(),
})

export type MemoFormValues = z.infer<typeof memoFormSchema>

const defaultCreateValues: MemoFormValues = {
  page_number: "",
  content: "",
  tags: [],
  favorite: false,
}

type UseMemoCreateFormOptions = {
  bookId: string
  onSuccess: (memo: MemoWithTags) => void
}

export function useMemoCreateForm({ bookId, onSuccess }: UseMemoCreateFormOptions) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoFormSchema),
    defaultValues: defaultCreateValues,
  })

  const watchFavorite = form.watch("favorite")

  const onSubmit = (values: MemoFormValues) => {
    startTransition(async () => {
      const result = await createMemo({
        book_id: bookId,
        page_number: values.page_number ? Number(values.page_number) : null,
        content: values.content,
        tags: values.tags,
        favorite: values.favorite,
      })

      if (result.error) {
        toast({ title: "登録エラー", description: result.error.message, variant: "destructive" })
        return
      }

      toast({ title: "メモを登録しました" })
      onSuccess(result.data)
    })
  }

  return { ...form, watchFavorite, isPending, onSubmit, defaultCreateValues }
}

type UseMemoEditFormOptions = {
  memo: MemoWithTags | null
  onSuccess: (memo: MemoWithTags) => void
  onDelete: (memoId: string) => void
}

export function useMemoEditForm({ memo, onSuccess, onDelete }: UseMemoEditFormOptions) {
  const [isPending, startTransition] = useTransition()
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoFormSchema),
    defaultValues: {
      page_number: memo?.page_number != null ? String(memo.page_number) : "",
      content: memo?.content ?? "",
      tags: memo?.tags ?? [],
      favorite: memo?.favorite ?? false,
    },
  })

  const watchFavorite = form.watch("favorite")

  const onSubmit = (values: MemoFormValues) => {
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
    })
  }

  return {
    ...form,
    watchFavorite,
    isPending,
    onSubmit,
    handleDelete,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
  }
}
