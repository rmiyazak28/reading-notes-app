import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getMemo, getTags } from "@/features/memos/actions"
import { getBook } from "@/features/books/actions"
import { MemoEditPage } from "@/features/memos/components/memo-edit-page"

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  const memoResult = await getMemo(id)
  if (memoResult.error?.code === "NOT_FOUND") redirect("/books")
  if (memoResult.error) throw new Error(memoResult.error.message)

  const memo = memoResult.data!

  // PC からのアクセスはスマホ専用画面のため書籍詳細へリダイレクト
  const headersList = await headers()
  const ua = headersList.get("user-agent") ?? ""
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  if (!isMobile) {
    redirect(`/books/${memo.book_id}`)
  }

  const [bookResult, tagsResult] = await Promise.all([
    getBook(memo.book_id),
    getTags(),
  ])

  if (bookResult.error?.code === "NOT_FOUND") redirect("/books")
  if (bookResult.error) throw new Error(bookResult.error.message)

  return (
    <MemoEditPage
      memo={memo}
      book={bookResult.data!}
      tagSuggestions={tagsResult.data ?? []}
    />
  )
}
