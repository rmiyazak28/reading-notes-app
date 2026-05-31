"use client"

import { useState, useMemo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/common/search-bar"
import { BookDetailHeader } from "@/features/books/components/book-detail-header"
import { BookEditModal } from "@/features/books/components/book-edit-modal"
import { MemoTable } from "@/features/memos/components/memo-table"
import { MemoCardList } from "@/features/memos/components/memo-card"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
import type { Book } from "@/features/books/types"
import type { MemoWithTags } from "@/features/memos/types"

type Props = {
  initialBook: Book
  initialMemos: MemoWithTags[]
}

export function BookDetailPage({ initialBook, initialMemos }: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [book, setBook] = useState<Book>(initialBook)
  const [memos, setMemos] = useState<MemoWithTags[]>(initialMemos)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // キー入力ごとにサーバーリクエストが発生しないよう、ロード済みメモをクライアントでフィルタする
  const filteredMemos = useMemo(() => {
    if (!searchQuery.trim()) return memos
    const q = searchQuery.toLowerCase()
    return memos.filter(
      memo =>
        memo.content.toLowerCase().includes(q) ||
        memo.tags.some(tag => tag.name.toLowerCase().includes(q))
    )
  }, [memos, searchQuery])

  const handleBookUpdated = (updatedBook: Book) => {
    // memoCount / starCount はカウント集計値のため更新結果には含まれない。既存値を引き継ぐ。
    setBook(prev => ({ ...updatedBook, memoCount: prev.memoCount, starCount: prev.starCount }))
  }

  const handleBookDeleted = () => {
    router.push("/books")
  }

  const handleAddMemo = () => {
    // TODO: MOD-03（PC）/ SCR-07（スマホ）実装後に接続する
    console.log("Add memo - not yet implemented")
  }

  const handleToggleFavorite = (memoId: string, newFavorite: boolean) => {
    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, favorite: newFavorite } : m))
    setBook(prev => ({
      ...prev,
      starCount: (prev.starCount ?? 0) + (newFavorite ? 1 : -1),
    }))
  }

  const handleMemoDeleted = (memoId: string) => {
    setMemos(prev => prev.filter(m => m.id !== memoId))
    setBook(prev => ({
      ...prev,
      memoCount: Math.max(0, (prev.memoCount ?? 0) - 1),
    }))
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-6">
        {/* 書籍ヘッダー */}
        <BookDetailHeader book={book} onEdit={() => setIsEditModalOpen(true)} />

        {/* 検索バー + メモ追加ボタン（PC） */}
        <div className="sticky top-16 z-40 pb-4 -mx-4 px-4 bg-gradient-to-b from-slate-900 via-slate-900/95 to-transparent mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="w-full max-w-xs">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="メモ内容・タグで検索..."
              />
            </div>
            {/* PC はコンテンツエリア上部に配置。スマホは下部 FAB で代替するため非表示。 */}
            <Button
              onClick={handleAddMemo}
              className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              メモを追加
            </Button>
          </div>
          <div className="mt-2">
            <span className="text-sm">
              <span className="text-[#22d3ee] font-medium">{filteredMemos.length}</span>
              <span className="text-[#cbd5e1]"> 件</span>
            </span>
          </div>
        </div>

        {/* メモ一覧 */}
        <div className="mt-4">
          {isMobile ? (
            <MemoCardList
              memos={filteredMemos}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleMemoDeleted}
            />
          ) : (
            <MemoTable
              memos={filteredMemos}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleMemoDeleted}
            />
          )}
        </div>
      </main>

      {/* FAB（スマホ） */}
      <Button
        onClick={handleAddMemo}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">メモを追加</span>
      </Button>

      <BookEditModal
        book={book}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={handleBookUpdated}
        onDelete={handleBookDeleted}
      />
    </div>
  )
}
