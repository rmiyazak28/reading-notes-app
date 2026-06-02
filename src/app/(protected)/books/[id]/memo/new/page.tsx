import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getBook } from "@/features/books/actions"
import { getUserTags } from "@/features/memos/actions"
import { MemoNewPage } from "@/features/memos/components/memo-new-page"

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  // PC からのアクセスはスマホ専用画面のため書籍詳細へリダイレクト
  const headersList = await headers()
  const ua = headersList.get("user-agent") ?? ""
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  if (!isMobile) {
    redirect(`/books/${id}`)
  }

  const [bookResult, tagsResult] = await Promise.all([
    getBook(id),
    getUserTags(),
  ])

  if (bookResult.error?.code === "NOT_FOUND") redirect("/books")
  if (bookResult.error) throw new Error(bookResult.error.message)

  return (
    <MemoNewPage
      book={bookResult.data!}
      tagSuggestions={tagsResult.data ?? []}
    />
  )
}
