"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, ChevronRight, BookMarked, BookOpen, Star } from "lucide-react"
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

interface SectionHeaderProps {
  title: string
  icon: React.ReactNode
  linkHref: string
  linkLabel: string
}

function SectionHeader({ title, icon, linkHref, linkLabel }: SectionHeaderProps) {
  return (
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
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="glass rounded-lg p-5 text-center text-[#94a3b8] text-xs">
      {message}
    </div>
  )
}

export function HomePage({ initialData }: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isPending, startTransition] = useTransition()

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<HomeMemoWithBook | null>(null)

  const [recentMemos, setRecentMemos] = useState<HomeMemoWithBook[]>(initialData.recentMemos)
  const [favoriteMemos, setFavoriteMemos] = useState<HomeMemoWithBook[]>(initialData.favoriteMemos)
  const [readingBooks, setReadingBooks] = useState<Book[]>(initialData.readingBooks)
  const [favoriteMemoCount, setFavoriteMemoCount] = useState(initialData.summary.favoriteMemoCount)

  const handleBookCreated = (newBook: Book) => {
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
        setFavoriteMemoCount((c) => c + 1)
        if (!favoriteMemos.some((m) => m.id === memo.id)) {
          setFavoriteMemos((prev) => [{ ...memo, favorite: true }, ...prev].slice(0, FAVORITE_LIMIT_DISPLAY))
        }
      } else {
        setFavoriteMemoCount((c) => Math.max(0, c - 1))
        removeMemoFromList(setFavoriteMemos, memo.id)
      }
      updateMemoInList(setFavoriteMemos, memo.id, { favorite: newFavorite })
    })
  }

  const handleDeleteMemo = (memoId: string) => {
    // 削除対象がお気に入りリストに存在する場合はカウントも減らす
    if (favoriteMemos.some((m) => m.id === memoId)) {
      setFavoriteMemoCount((c) => Math.max(0, c - 1))
    }
    removeMemoFromList(setRecentMemos, memoId)
    removeMemoFromList(setFavoriteMemos, memoId)
    setEditingMemo(null)
  }

  // MemoEditModal は MemoWithTags を返すため、編集前の book 情報を補完して HomeMemoWithBook に変換する
  const handleMemoUpdated = (updated: MemoWithTags) => {
    if (!editingMemo) return
    const updatedWithBook: HomeMemoWithBook = { ...updated, book: editingMemo.book }
    const wasAlreadyFavorite = favoriteMemos.some((m) => m.id === updatedWithBook.id)

    updateMemoInList(setRecentMemos, updatedWithBook.id, updatedWithBook)

    if (updatedWithBook.favorite) {
      if (!wasAlreadyFavorite) {
        // お気に入りOFFから→ONに変わった
        setFavoriteMemoCount((c) => c + 1)
        setFavoriteMemos((prev) => [updatedWithBook, ...prev].slice(0, FAVORITE_LIMIT_DISPLAY))
      } else {
        updateMemoInList(setFavoriteMemos, updatedWithBook.id, updatedWithBook)
      }
    } else {
      if (wasAlreadyFavorite) {
        // お気に入りONから→OFFに変わった
        setFavoriteMemoCount((c) => Math.max(0, c - 1))
      }
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

  // --- PC用コンパクトリスト ---
  const compactBookRows = (books: Book[]) =>
    books.map((b) => <HomeCompactBookRow key={b.id} book={b} />)

  const compactMemoRows = (memos: HomeMemoWithBook[], multiLine?: boolean) =>
    memos.map((m) => (
      <HomeCompactMemoRow
        key={m.id}
        memo={m}
        onEdit={() => handleMemoCardClick(m)}
        onFavoriteClick={() => handleToggleFavorite(m)}
        isPending={isPending}
        multiLine={multiLine}
      />
    ))

  // --- スマホ用横スクロールカード ---
  const scrollBookCards = (books: Book[]) => (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {books.map((b) => <HomeBookCard key={b.id} book={b} />)}
    </div>
  )

  const scrollMemoCards = (memos: HomeMemoWithBook[]) => (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {memos.map((m) => (
        <HomeMemoCard
          key={m.id}
          memo={m}
          onEdit={() => handleMemoCardClick(m)}
          onFavoriteClick={() => handleToggleFavorite(m)}
          isPending={isPending}
        />
      ))}
    </div>
  )

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
        <HomeSummaryBar summary={{ ...initialData.summary, favoriteMemoCount }} />

        {/*
          PC: 上段2カラム（読書中｜最近のメモ）＋下段全幅（お気に入りメモ）
          スマホ: 縦積み1カラム（最近のメモ→お気に入りメモ→読書中）
          order クラスでモバイル順序と PC グリッド配置を両立する
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 読書中: スマホ=3番目 / PC=左上 */}
          <section className="order-3 md:order-1 flex flex-col gap-3">
            <SectionHeader
              title="読書中"
              icon={<BookMarked className="h-3.5 w-3.5 text-[#94a3b8]" />}
              linkHref="/books?status=reading"
              linkLabel="一覧を見る"
            />
            {readingBooks.length === 0 ? (
              <EmptyCard message="読書中の書籍はありません" />
            ) : isMobile ? (
              scrollBookCards(readingBooks)
            ) : (
              <div className="glass rounded-lg overflow-hidden divide-y divide-white/10">
                {compactBookRows(readingBooks)}
              </div>
            )}
          </section>

          {/* 最近のメモ: スマホ=1番目 / PC=右上 */}
          <section className="order-1 md:order-2 flex flex-col gap-3">
            <SectionHeader
              title="最近のメモ"
              icon={<BookOpen className="h-3.5 w-3.5 text-[#94a3b8]" />}
              linkHref="/memos"
              linkLabel="全メモ検索"
            />
            {recentMemos.length === 0 ? (
              <EmptyCard message="メモがまだ登録されていません" />
            ) : isMobile ? (
              scrollMemoCards(recentMemos)
            ) : (
              <div className="glass rounded-lg overflow-hidden divide-y divide-white/10">
                {compactMemoRows(recentMemos)}
              </div>
            )}
          </section>

          {/* お気に入りメモ: スマホ=2番目 / PC=下段全幅 */}
          <section className="order-2 md:order-3 md:col-span-2 flex flex-col gap-3">
            <SectionHeader
              title="お気に入りメモ"
              icon={<Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
              linkHref="/favorites"
              linkLabel="一覧を見る"
            />
            {favoriteMemos.length === 0 ? (
              <EmptyCard message="お気に入りメモはまだありません" />
            ) : isMobile ? (
              scrollMemoCards(favoriteMemos)
            ) : (
              <div className="glass rounded-lg overflow-hidden divide-y divide-white/10">
                {/* PC全幅では本文を2〜3行表示 */}
                {compactMemoRows(favoriteMemos, true)}
              </div>
            )}
          </section>

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

const HOME_LIMIT_DISPLAY = 5
const FAVORITE_LIMIT_DISPLAY = 10
