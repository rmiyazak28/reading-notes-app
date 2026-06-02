import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getBook } from "@/features/books/actions"
import { getMemos, getUserTags } from "@/features/memos/actions"
import { BookDetailPage } from "@/features/books/components/book-detail-page"

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userName = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? ""

  const [bookResult, memosResult, tagsResult] = await Promise.all([
    getBook(id),
    getMemos({ bookId: id }),
    getUserTags(),
  ])

  if (bookResult.error?.code === "NOT_FOUND") notFound()
  if (bookResult.error) throw new Error(bookResult.error.message)
  if (memosResult.error) throw new Error(memosResult.error.message)

  return (
    <BookDetailPage
      initialBook={bookResult.data!}
      initialMemos={memosResult.data!}
      initialTags={tagsResult.data ?? []}
      userName={userName}
    />
  )
}
