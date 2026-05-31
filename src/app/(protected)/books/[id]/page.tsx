import { notFound } from "next/navigation"
import { getBook } from "@/features/books/actions"
import { getMemos } from "@/features/memos/actions"
import { BookDetailPage } from "@/features/books/components/book-detail-page"

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  const [bookResult, memosResult] = await Promise.all([
    getBook(id),
    getMemos({ bookId: id }),
  ])

  if (bookResult.error?.code === "NOT_FOUND") notFound()
  if (bookResult.error) throw new Error(bookResult.error.message)
  if (memosResult.error) throw new Error(memosResult.error.message)

  return (
    <BookDetailPage
      initialBook={bookResult.data!}
      initialMemos={memosResult.data!}
    />
  )
}
