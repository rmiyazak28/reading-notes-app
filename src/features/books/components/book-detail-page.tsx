"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  ChevronRight,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/common/search-bar"
import { BookDetailHeader } from "@/features/books/components/book-detail-header"
import { BookEditModal } from "@/features/books/components/book-edit-modal"
import { MemoCreateModal } from "@/features/memos/components/memo-create-modal"
import { MemoEditModal } from "@/features/memos/components/memo-edit-modal"
import { MemoTable } from "@/features/memos/components/memo-table"
import { MemoCardList } from "@/features/memos/components/memo-card"
import { NavigationDrawer } from "@/components/layout/navigation-drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Book } from "@/features/books/types"
import type { MemoWithTags, Tag } from "@/features/memos/types"

type Props = {
  initialBook: Book
  initialMemos: MemoWithTags[]
  initialTags: Tag[]
  userName: string
}

export function BookDetailPage({ initialBook, initialMemos, initialTags, userName }: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [book, setBook] = useState<Book>(initialBook)
  const [memos, setMemos] = useState<MemoWithTags[]>(initialMemos)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateMemoModalOpen, setIsCreateMemoModalOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<MemoWithTags | null>(null)

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
    if (isMobile) {
      router.push(`/books/${book.id}/memo/new`)
    } else {
      setIsCreateMemoModalOpen(true)
    }
  }

  const handleMemoCreated = (memo: MemoWithTags) => {
    setMemos(prev => [memo, ...prev])
    setBook(prev => ({
      ...prev,
      memoCount: (prev.memoCount ?? 0) + 1,
      starCount: memo.favorite ? (prev.starCount ?? 0) + 1 : (prev.starCount ?? 0),
    }))
    // 新規タグがあれば suggestions に追加
    const existingIds = new Set(tags.map(t => t.id))
    const newTags = memo.tags.filter(t => !existingIds.has(t.id))
    if (newTags.length > 0) {
      setTags(prev => [...prev, ...newTags].sort((a, b) => a.name.localeCompare(b.name)))
    }
  }

  const handleToggleFavorite = (memoId: string, newFavorite: boolean) => {
    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, favorite: newFavorite } : m))
    setBook(prev => ({
      ...prev,
      starCount: (prev.starCount ?? 0) + (newFavorite ? 1 : -1),
    }))
  }

  const handleEditMemo = (memo: MemoWithTags) => {
    if (isMobile) {
      router.push(`/memos/${memo.id}/edit?from=books/${book.id}`)
    } else {
      setEditingMemo(memo)
    }
  }

  const handleMemoUpdated = (updated: MemoWithTags) => {
    const prev = memos.find(m => m.id === updated.id)
    setMemos(memos => memos.map(m => m.id === updated.id ? updated : m))
    if (prev) {
      setBook(b => ({
        ...b,
        starCount: (b.starCount ?? 0) + (updated.favorite ? 1 : 0) - (prev.favorite ? 1 : 0),
      }))
    }
    // 新規タグがあれば suggestions に追加
    const existingIds = new Set(tags.map(t => t.id))
    const newTags = updated.tags.filter(t => !existingIds.has(t.id))
    if (newTags.length > 0) {
      setTags(prev => [...prev, ...newTags].sort((a, b) => a.name.localeCompare(b.name)))
    }
  }

  const handleMemoDeleted = (memoId: string) => {
    const deletedMemo = memos.find(m => m.id === memoId)
    setMemos(prev => prev.filter(m => m.id !== memoId))
    setBook(prev => ({
      ...prev,
      memoCount: Math.max(0, (prev.memoCount ?? 0) - 1),
      starCount: deletedMemo?.favorite
        ? Math.max(0, (prev.starCount ?? 0) - 1)
        : (prev.starCount ?? 0),
    }))
  }

  return (
    <div className="min-h-screen">
      {/* ── スマホ専用ヘッダーオーバーレイ ──────────────────────────────
          グローバルヘッダーを視覚的に置き換えるため z-[60]（グローバルの z-50 より上）に配置。
          ハンバーガーアイコンとドロワーをここに内包することで他画面のヘッダーを変更せずに済む。 */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 z-[60] glass border-b border-white/10">
        <div className="flex items-center justify-between h-full px-4">
          {/* 戻るボタン */}
          <Link
            href="/books"
            className="flex items-center justify-center h-9 w-9 rounded-lg text-foreground hover:bg-white/10 transition-colors"
            aria-label="書籍一覧へ戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* 書籍タイトル（中央） */}
          <span className="flex-1 text-center text-sm font-semibold text-foreground truncate px-3">
            {book.title}
          </span>

          {/* ハンバーガー → ナビゲーションドロワー */}
          <NavigationDrawer userName={userName} />
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* PC パンくずリスト */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <Link href="/books" className="hover:text-foreground transition-colors">
            書籍一覧
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span className="text-foreground truncate max-w-xs">{book.title}</span>
        </nav>

        {/* 書籍ヘッダー */}
        <BookDetailHeader book={book} onEdit={() => setIsEditModalOpen(true)} />

        {/* 検索バー + メモ追加ボタン（PC） */}
        <div className="sticky top-16 z-40 py-3 -mx-4 px-4 bg-transparent backdrop-blur-md mt-4">
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
              <span className="text-lake-accent font-medium">{filteredMemos.length}</span>
              <span className="text-foreground-secondary"> 件</span>
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
              onEdit={handleEditMemo}
            />
          ) : (
            <MemoTable
              memos={filteredMemos}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleMemoDeleted}
              onEdit={handleEditMemo}
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

      <MemoCreateModal
        bookId={book.id}
        open={isCreateMemoModalOpen}
        onOpenChange={setIsCreateMemoModalOpen}
        onSuccess={handleMemoCreated}
        tagSuggestions={tags}
      />

      <MemoEditModal
        memo={editingMemo}
        open={editingMemo !== null}
        onOpenChange={(open) => { if (!open) setEditingMemo(null) }}
        onSuccess={handleMemoUpdated}
        onDelete={handleMemoDeleted}
        tagSuggestions={tags}
      />
    </div>
  )
}
