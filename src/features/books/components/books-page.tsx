"use client"

import { useState, useMemo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { SearchBar } from "@/components/search-bar"
import { BookTable } from "@/components/book-table"
import { BookCardList } from "@/components/book-card"
import { EmptyState } from "@/components/empty-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { dummyBooks, type Book } from "@/lib/books"

export function BooksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [books] = useState<Book[]>(dummyBooks)
  const isMobile = useIsMobile()

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books
    const query = searchQuery.toLowerCase()
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    )
  }, [books, searchQuery])

  const handleAddBook = () => {
    // TODO: Implement add book modal
    console.log("Add book clicked")
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Search bar - sticky on scroll */}
        <div className="sticky top-16 z-40 pb-4 -mx-4 px-4 bg-gradient-to-b from-slate-900 via-slate-900/95 to-transparent">
          <div className="flex items-center justify-between gap-4">
            <div className="w-full max-w-xs">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            {/* Add button - desktop only (mobile has FAB) */}
            <Button
              onClick={handleAddBook}
              className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              書籍を追加
            </Button>
          </div>
          {/* Book count */}
          <div className="mt-2">
            <span className="text-sm">
              <span className="text-[#22d3ee] font-medium">{filteredBooks.length}</span>
              <span className="text-[#cbd5e1]"> 冊</span>
            </span>
          </div>
        </div>

        {/* Book list */}
        <div className="mt-4">
          {filteredBooks.length === 0 ? (
            <EmptyState onAddBook={handleAddBook} />
          ) : isMobile ? (
            <BookCardList books={filteredBooks} />
          ) : (
            <BookTable books={filteredBooks} />
          )}
        </div>
      </main>

      {/* FAB for mobile */}
      <Button
        onClick={handleAddBook}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">書籍を追加</span>
      </Button>
    </div>
  )
}
