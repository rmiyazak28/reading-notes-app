"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  Menu,
  User,
  Home,
  BookOpen,
  FileText,
  Star,
  Settings,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SearchBar } from "@/components/common/search-bar"
import { BookDetailHeader } from "@/features/books/components/book-detail-header"
import { BookEditModal } from "@/features/books/components/book-edit-modal"
import { MemoTable } from "@/features/memos/components/memo-table"
import { MemoCardList } from "@/features/memos/components/memo-card"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { signOut } from "@/features/auth/actions"
import type { Book } from "@/features/books/types"
import type { MemoWithTags } from "@/features/memos/types"

const navItems = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/books", label: "書籍一覧", icon: BookOpen },
  { href: "/memos", label: "全メモ検索", icon: FileText },
  { href: "/favorites", label: "お気に入り", icon: Star },
]

type Props = {
  initialBook: Book
  initialMemos: MemoWithTags[]
  userName: string
}

export function BookDetailPage({ initialBook, initialMemos, userName }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [book, setBook] = useState<Book>(initialBook)
  const [memos, setMemos] = useState<MemoWithTags[]>(initialMemos)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSignOutPending, startSignOutTransition] = useTransition()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

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

  const handleSignOut = () => {
    startSignOutTransition(async () => {
      await signOut()
      router.push("/login")
    })
  }

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
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-white/10"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">メニューを開く</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="glass bg-slate-900/95 border-white/10 flex flex-col p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>ナビゲーションメニュー</SheetTitle>
              </SheetHeader>

              {/* ユーザー情報（タップ不可・表示のみ） */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground truncate">{userName}</span>
              </div>

              {/* ナビゲーション */}
              <nav className="flex flex-col gap-1 flex-1 px-4 pt-4">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        pathname === item.href || pathname.startsWith(item.href + "/")
                          ? "text-primary bg-white/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              {/* 設定・ログアウト */}
              <div className="flex flex-col gap-1 border-t border-white/10 px-4 py-4">
                <Link
                  href="/settings"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  設定
                </Link>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  disabled={isSignOutPending}
                  className="flex items-center gap-3 px-4 py-3 h-auto rounded-lg text-sm font-medium text-destructive hover:text-destructive hover:bg-white/5 justify-start"
                >
                  <LogOut className="h-5 w-5" />
                  ログアウト
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* PC パンくずリスト */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm text-[#94a3b8] mb-4">
          <Link href="/books" className="hover:text-foreground transition-colors">
            書籍一覧
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span className="text-[#f1f5f9] truncate max-w-xs">{book.title}</span>
        </nav>

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
