"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, ChevronRight, Clock, BookMarked, BookOpen, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookRegisterModal } from "@/features/books/components/book-register-modal"
import { MemoEditModal } from "@/features/memos/components/memo-edit-modal"
import { HomeSummaryBar } from "@/features/home/components/home-summary-bar"
import { HomeBookCard } from "@/features/home/components/home-book-card"
import { HomeMemoCard } from "@/features/home/components/home-memo-card"
import { HomeCompactBookRow } from "@/features/home/components/home-compact-book-row"
import { HomeCompactMemoRow } from "@/features/home/components/home-compact-memo-row"
import { useIsMobile } from "@/hooks/use-mobile"
import { toggleFavorite } from "@/features/memos/actions"
import { toast } from "@/hooks/use-toast"
import type { HomeData, HomeMemoWithBook } from "@/features/home/actions"
import type { Book } from "@/features/books/types"
import type { MemoWithTags } from "@/features/memos/types"

type Props = {
  initialData: HomeData
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  linkHref: string
  linkLabel: string
  emptyMessage: string
  hasItems: boolean
  // PC: コンパクトリスト / スマホ: 横スクロールカード
  compactRows: React.ReactNode
  scrollCards: React.ReactNode
  isMobile: boolean
}

function HomeSection({
  title,
  icon,
  linkHref,
  linkLabel,
  emptyMessage,
  hasItems,
  compactRows,
  scrollCards,
  isMobile,
}: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f1f5f9]">
          {icon}
          {title}
        </h2>
        <Link
          href={linkHref}
          className="flex items-center gap-0.5 text-xs text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
        >
          {linkLabel}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {!hasItems ? (
        <div className="glass rounded-lg p-5 text-center text-[#94a3b8] text-xs">
          {emptyMessage}
        </div>
      ) : isMobile ? (
        // スマホ：横スクロールカード列
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {scrollCards}
        </div>
      ) : (
        // PC：コンパクトリスト
        <div className="glass rounded-lg overflow-hidden divide-y divide-white/10">
          {compactRows}
        </div>
      )}
    </section>
  )
}

export function HomePage({ initialData }: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isPending, startTransition] = useTransition()

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<HomeMemoWithBook | null>(null)

  const [recentBooks, setRecentBooks] = useState<Book[]>(initialData.recentBooks)
  const [recentMemos, setRecentMemos] = useState<HomeMemoWithBook[]>(initialData.recentMemos)
  const [favoriteMemos, setFavoriteMemos] = useState<HomeMemoWithBook[]>(initialData.favoriteMemos)
  const [readingBooks, setReadingBooks] = useState<Book[]>(initialData.readingBooks)

  const handleBookCreated = (newBook: Book) => {
    setRecentBooks((prev) => [newBook, ...prev].slice(0, HOME_LIMIT_DISPLAY))
    if (newBook.status === "reading") {
      setReadingBooks((prev) => [newBook, ...prev].slice(0, HOME_LIMIT_DISPLAY))
    }
  }

  const removeMemoFromList = (
    setter: React.Dispatch<React.SetStateAction<HomeMemoWithBook[]>>,
    memoId: string
  ) => setter((prev) => prev.filter((m) => m.id !== memoId))

  const updateMemoInList = (
    setter: React.Dispatch<React.SetStateAction<HomeMemoWithBook[]>>,
    memoId: string,
    patch: Partial<HomeMemoWithBook>
  ) => setter((prev) => prev.map((m) => (m.id === memoId ? { ...m, ...patch } : m)))

  const handleToggleFavorite = (memo: HomeMemoWithBook) => {
    startTransition(async () => {
      const result = await toggleFavorite(memo.id)
      if (result.error) {
        toast({ title: "エラー", description: result.error.message, variant: "destructive" })
        return
      }
      const newFavorite = result.data.favorite
      updateMemoInList(setRecentMemos, memo.id, { favorite: newFavorite })
      if (newFavorite) {
        if (!favoriteMemos.some((m) => m.id === memo.id)) {
          setFavoriteMemos((prev) => [{ ...memo, favorite: true }, ...prev].slice(0, HOME_LIMIT_DISPLAY))
        }
      } else {
        removeMemoFromList(setFavoriteMemos, memo.id)
      }
      updateMemoInList(setFavoriteMemos, memo.id, { favorite: newFavorite })
    })
  }

  const handleDeleteMemo = (memoId: string) => {
    removeMemoFromList(setRecentMemos, memoId)
    removeMemoFromList(setFavoriteMemos, memoId)
    setEditingMemo(null)
  }

  // MemoEditModal は MemoWithTags を返すため、編集前の book 情報を補完して HomeMemoWithBook に変換する
  const handleMemoUpdated = (updated: MemoWithTags) => {
    const updatedWithBook: HomeMemoWithBook = { ...updated, book: editingMemo!.book }
    updateMemoInList(setRecentMemos, updatedWithBook.id, updatedWithBook)
    if (updatedWithBook.favorite) {
      if (!favoriteMemos.some((m) => m.id === updatedWithBook.id)) {
        setFavoriteMemos((prev) => [updatedWithBook, ...prev].slice(0, HOME_LIMIT_DISPLAY))
      } else {
        updateMemoInList(setFavoriteMemos, updatedWithBook.id, updatedWithBook)
      }
    } else {
      removeMemoFromList(setFavoriteMemos, updatedWithBook.id)
    }
    setEditingMemo(null)
  }

  const handleMemoCardClick = (memo: HomeMemoWithBook) => {
    if (isMobile) {
      router.push(`/memos/${memo.id}/edit`)
    } else {
      setEditingMemo(memo)
    }
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* PC：書籍追加ボタン */}
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

        {/* サマリーバー（PC・スマホ共通） */}
        <HomeSummaryBar summary={initialData.summary} />

        {/* 2カラムグリッド（PC） / 1カラム縦積み（スマホ） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HomeSection
            title="最近読んだ本"
            icon={<Clock className="h-3.5 w-3.5 text-[#94a3b8]" />}
            linkHref="/books"
            linkLabel="一覧を見る"
            emptyMessage="書籍がまだ登録されていません"
            hasItems={recentBooks.length > 0}
            isMobile={isMobile}
            compactRows={recentBooks.map((b) => <HomeCompactBookRow key={b.id} book={b} />)}
            scrollCards={
              <>{recentBooks.map((b) => <HomeBookCard key={b.id} book={b} />)}</>
            }
          />

          <HomeSection
            title="読書中"
            icon={<BookMarked className="h-3.5 w-3.5 text-[#94a3b8]" />}
            linkHref="/books?status=reading"
            linkLabel="一覧を見る"
            emptyMessage="読書中の書籍はありません"
            hasItems={readingBooks.length > 0}
            isMobile={isMobile}
            compactRows={readingBooks.map((b) => <HomeCompactBookRow key={b.id} book={b} />)}
            scrollCards={
              <>{readingBooks.map((b) => <HomeBookCard key={b.id} book={b} />)}</>
            }
          />

          <HomeSection
            title="最近のメモ"
            icon={<BookOpen className="h-3.5 w-3.5 text-[#94a3b8]" />}
            linkHref="/memos"
            linkLabel="全メモ検索"
            emptyMessage="メモがまだ登録されていません"
            hasItems={recentMemos.length > 0}
            isMobile={isMobile}
            compactRows={recentMemos.map((m) => (
              <HomeCompactMemoRow
                key={m.id}
                memo={m}
                onEdit={() => handleMemoCardClick(m)}
                onFavoriteClick={() => handleToggleFavorite(m)}
                isPending={isPending}
              />
            ))}
            scrollCards={
              <>
                {recentMemos.map((m) => (
                  <HomeMemoCard
                    key={m.id}
                    memo={m}
                    onEdit={() => handleMemoCardClick(m)}
                    onFavoriteClick={() => handleToggleFavorite(m)}
                    isPending={isPending}
                  />
                ))}
              </>
            }
          />

          <HomeSection
            title="お気に入りメモ"
            icon={<Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
            linkHref="/favorites"
            linkLabel="一覧を見る"
            emptyMessage="お気に入りメモはまだありません"
            hasItems={favoriteMemos.length > 0}
            isMobile={isMobile}
            compactRows={favoriteMemos.map((m) => (
              <HomeCompactMemoRow
                key={m.id}
                memo={m}
                onEdit={() => handleMemoCardClick(m)}
                onFavoriteClick={() => handleToggleFavorite(m)}
                isPending={isPending}
              />
            ))}
            scrollCards={
              <>
                {favoriteMemos.map((m) => (
                  <HomeMemoCard
                    key={m.id}
                    memo={m}
                    onEdit={() => handleMemoCardClick(m)}
                    onFavoriteClick={() => handleToggleFavorite(m)}
                    isPending={isPending}
                  />
                ))}
              </>
            }
          />
        </div>
      </main>

      {/* スマホ FAB */}
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
          onDelete={handleDeleteMemo}
          tagSuggestions={initialData.tags}
        />
      )}
    </div>
  )
}

// home-page 内でのみ使用する表示件数の上限定数
const HOME_LIMIT_DISPLAY = 5
