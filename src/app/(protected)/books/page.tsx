// src/app/(protected)/books/page.tsx

import { getBooks } from "@/features/books/actions"
import { BooksPage } from "@/features/books/components/books-page"

export default async function Page() {
  const { data: books, error } = await getBooks()

  // エラー時はerror.tsxが処理するのでthrowでOK（設計書§10.2準拠）
  if (error) throw new Error(error)

  return <BooksPage initialBooks={books ?? []} />
}