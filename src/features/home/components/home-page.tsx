"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, BookOpen, Star, BookMarked, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookTable } from "@/features/books/components/book-table"
import { BookCardList } from "@/features/books/components/book-card"
import { MemoTable } from "@/features/memos/components/memo-table"
import { MemoCardList } from "@/features/memos/components/memo-card"
import { BookRegisterModal } from "@/features/books/components/book-register-modal"
import { MemoEditModal } from "@/features/memos/components/memo-edit-modal"
import { useIsMobile } from "@/hooks/use-mobile"
import type { HomeData } from "@/features/home/actions"
import type { Tag } from "@/features/memos/types"
import type { Book } from "@/features/books/types"
import type { MemoWithTags } from "@/features/memos/types"

type Props = {
  initialData: HomeData
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-base font-semibold text-[#f1f5f9] mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="glass rounded-lg p-6 text-center text-[#94a3b8] text-sm">
      {message}
    </div>
  )
}

export function HomePage({ initialData }: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<MemoWithTags | null>(null)

  const [recentBooks, setRecentBooks] = useState<Book[]>(initialData.recentBooks)
  const [recentMemos, setRecentMemos] = useState<MemoWithTags[]>(initialData.recentMemos)
  const [favoriteMemos, setFavoriteMemos] = useState<MemoWithTags[]>(initialData.favoriteMemos)
  const [readingBooks, setReadingBooks] = useState<Book[]>(initialData.readingBooks)
  const tags: Tag[] = initialData.tags

  const handleBookCreated = (newBook: Book) => {
    setRecentBooks((prev) => [newBook, ...prev].slice(0, 5))
    if (newBook.status === "reading") {
      setReadingBooks((prev) => [newBook, ...prev].slice(0, 5))
    }
  }

  const updateMemoInList = (
    setter: React.Dispatch<React.SetStateAction<MemoWithTags[]>>,
    memoId: string,
    patch: Partial<MemoWithTags>
  ) => {
    setter((prev) => prev.map((m) => (m.id === memoId ? { ...m, ...patch } : m)))
  }

  const removeMemoFromList = (
    setter: React.Dispatch<React.SetStateAction<MemoWithTags[]>>,
    memoId: string
  ) => {
    setter((prev) => prev.filter((m) => m.id !== memoId))
  }

  const handleToggleFavorite = (memoId: string, newFavorite: boolean) => {
    updateMemoInList(setRecentMemos, memoId, { favorite: newFavorite })
    if (newFavorite) {
      // お気に入りON: recentMemos の該当メモを favoriteMemos に追加（未登録なら）
      const memo = recentMemos.find((m) => m.id === memoId) ??
        favoriteMemos.find((m) => m.id === memoId)
      if (memo && !favoriteMemos.some((m) => m.id === memoId)) {
        setFavoriteMemos((prev) => [{ ...memo, favorite: true }, ...prev].slice(0, 5))
      }
    } else {
      // お気に入りOFF: favoriteMemos から除去
      removeMemoFromList(setFavoriteMemos, memoId)
    }
    updateMemoInList(setFavoriteMemos, memoId, { favorite: newFavorite })
  }

  const handleDeleteMemo = (memoId: string) => {
    removeMemoFromList(setRecentMemos, memoId)
    removeMemoFromList(setFavoriteMemos, memoId)
  }

  const handleMemoUpdated = (updated: MemoWithTags) => {
    updateMemoInList(setRecentMemos, updated.id, updated)
    if (updated.favorite) {
      if (!favoriteMemos.some((m) => m.id === updated.id)) {
        setFavoriteMemos((prev) => [updated, ...prev].slice(0, 5))
      } else {
        updateMemoInList(setFavoriteMemos, updated.id, updated)
      }
    } else {
      removeMemoFromList(setFavoriteMemos, updated.id)
    }
    setEditingMemo(null)
  }

  const handleMemoDeleted = (memoId: string) => {
    handleDeleteMemo(memoId)
    setEditingMemo(null)
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* 書籍追加ボタン（PC：上部インライン、スマホ：FAB） */}
        {!isMobile && (
          <div className="flex justify-end">
            <Button
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              書籍を追加
            </Button>
          </div>
        )}

        {/* 最近読んだ本 */}
        <Section title="最近読んだ本" icon={<Clock className="h-4 w-4 text-[#94a3b8]" />}>
          {recentBooks.length === 0 ? (
            <EmptySection message="書籍がまだ登録されていません" />
          ) : isMobile ? (
            <BookCardList books={recentBooks} />
          ) : (
            <BookTable books={recentBooks} />
          )}
        </Section>

        {/* 最近のメモ */}
        <Section title="最近のメモ" icon={<BookOpen className="h-4 w-4 text-[#94a3b8]" />}>
          {recentMemos.length === 0 ? (
            <EmptySection message="メモがまだ登録されていません" />
          ) : isMobile ? (
            <MemoCardList
              memos={recentMemos}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteMemo}
            />
          ) : (
            <MemoTable
              memos={recentMemos}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteMemo}
              onEdit={setEditingMemo}
            />
          )}
        </Section>

        {/* お気に入りメモ */}
        <Section title="お気に入りメモ" icon={<Star className="h-4 w-4 text-amber-400 fill-amber-400" />}>
          {favoriteMemos.length === 0 ? (
            <EmptySection message="お気に入りメモはまだありません" />
          ) : isMobile ? (
            <MemoCardList
              memos={favoriteMemos}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteMemo}
            />
          ) : (
            <MemoTable
              memos={favoriteMemos}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteMemo}
              onEdit={setEditingMemo}
            />
          )}
        </Section>

        {/* 読書中 */}
        <Section title="読書中" icon={<BookMarked className="h-4 w-4 text-[#94a3b8]" />}>
          {readingBooks.length === 0 ? (
            <EmptySection message="読書中の書籍はありません" />
          ) : isMobile ? (
            <BookCardList books={readingBooks} />
          ) : (
            <BookTable books={readingBooks} />
          )}
        </Section>
      </main>

      {/* スマホFAB */}
      {isMobile && (
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label="書籍を追加"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <BookRegisterModal
        open={isRegisterModalOpen}
        onOpenChange={setIsRegisterModalOpen}
        onSuccess={handleBookCreated}
      />

      {/* PC：メモ編集モーダル */}
      {!isMobile && (
        <MemoEditModal
          memo={editingMemo}
          open={editingMemo !== null}
          onOpenChange={(open) => { if (!open) setEditingMemo(null) }}
          onSuccess={handleMemoUpdated}
          onDelete={handleMemoDeleted}
          tagSuggestions={tags}
        />
      )}
    </div>
  )
}
