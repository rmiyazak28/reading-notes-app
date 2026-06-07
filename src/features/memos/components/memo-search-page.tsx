"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MemoSearchFilters } from "@/features/memos/components/memo-search-filters"
import { MemoSearchTable } from "@/features/memos/components/memo-search-table"
import { MemoSearchCardList } from "@/features/memos/components/memo-search-card"
import { MemoEditModal } from "@/features/memos/components/memo-edit-modal"
import { useIsMobile } from "@/hooks/use-mobile"
import { searchMemos } from "@/features/memos/actions"
import { toggleFavorite } from "@/features/memos/actions"
import { toast } from "@/hooks/use-toast"
import type { MemoWithBook } from "@/features/memos/types"
import type { Tag } from "@/features/memos/types"

const PAGE_SIZE = 50

type Props = {
  initialMemos: MemoWithBook[]
  initialQuery: string
  initialFavoriteOnly: boolean
  initialSortBy: "created_at" | "updated_at"
  tagSuggestions: Tag[]
}

export function MemoSearchPage({
  initialMemos,
  initialQuery,
  initialFavoriteOnly,
  initialSortBy,
  tagSuggestions,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const [memos, setMemos] = useState<MemoWithBook[]>(initialMemos)
  const [hasMore, setHasMore] = useState(initialMemos.length === PAGE_SIZE)
  const [query, setQuery] = useState(initialQuery)
  const [favoriteOnly, setFavoriteOnly] = useState(initialFavoriteOnly)
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at">(initialSortBy)
  const [editingMemo, setEditingMemo] = useState<MemoWithBook | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, startLoadMoreTransition] = useTransition()
  // useTransition を使うと Concurrent Mode の再レンダーで pending が解除されないケースがあるため、
  // メモ単位の Set でトグル中を管理する
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // 検索条件変更をURLに反映する（debounce 付き）
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateUrl = useCallback(
    (q: string, fav: boolean, sort: "created_at" | "updated_at") => {
      const params = new URLSearchParams(searchParams.toString())
      if (q) params.set("q", q); else params.delete("q")
      if (fav) params.set("favorite", "1"); else params.delete("favorite")
      if (sort !== "created_at") params.set("sort", sort); else params.delete("sort")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // 検索条件が変わったら先頭50件で再取得する
  const fetchMemos = useCallback(
    (q: string, fav: boolean, sort: "created_at" | "updated_at") => {
      startTransition(async () => {
        const result = await searchMemos({ query: q, favoriteOnly: fav, sortBy: sort, limit: PAGE_SIZE, offset: 0 })
        if (result.error) {
          toast({ title: "取得エラー", description: result.error.message, variant: "destructive" })
          return
        }
        setMemos(result.data)
        setHasMore(result.data.length === PAGE_SIZE)
      })
    },
    []
  )

  const handleQueryChange = (v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateUrl(v, favoriteOnly, sortBy)
      fetchMemos(v, favoriteOnly, sortBy)
    }, 400)
  }

  const handleFavoriteOnlyChange = (v: boolean) => {
    setFavoriteOnly(v)
    updateUrl(query, v, sortBy)
    fetchMemos(query, v, sortBy)
  }

  const handleSortByChange = (v: "created_at" | "updated_at") => {
    setSortBy(v)
    updateUrl(query, favoriteOnly, v)
    fetchMemos(query, favoriteOnly, v)
  }

  const handleLoadMore = () => {
    startLoadMoreTransition(async () => {
      const result = await searchMemos({
        query,
        favoriteOnly,
        sortBy,
        limit: PAGE_SIZE,
        offset: memos.length,
      })
      if (result.error) {
        toast({ title: "取得エラー", description: result.error.message, variant: "destructive" })
        return
      }
      setMemos(prev => [...prev, ...result.data])
      setHasMore(result.data.length === PAGE_SIZE)
    })
  }

  const handleToggleFavorite = async (memo: MemoWithBook) => {
    if (togglingIds.has(memo.id)) return
    setTogglingIds(prev => new Set(prev).add(memo.id))
    try {
      const result = await toggleFavorite(memo.id)
      if (result.error) {
        toast({ title: "エラー", description: result.error.message, variant: "destructive" })
        return
      }
      const newFavorite = result.data.favorite
      // お気に入りのみ表示中に解除した場合は一覧から除去する
      if (favoriteOnly && !newFavorite) {
        setMemos(prev => prev.filter(m => m.id !== memo.id))
      } else {
        setMemos(prev => prev.map(m => m.id === memo.id ? { ...m, favorite: newFavorite } : m))
      }
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(memo.id); return next })
    }
  }

  const handleMemoUpdated = (updated: MemoWithBook) => {
    setMemos(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    setEditingMemo(null)
  }

  const handleMemoDeleted = (id: string) => {
    setMemos(prev => prev.filter(m => m.id !== id))
    setEditingMemo(null)
  }

  // コンポーネントアンマウント時にdebounceをクリア
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-6">
        <MemoSearchFilters
          query={query}
          onQueryChange={handleQueryChange}
          favoriteOnly={favoriteOnly}
          onFavoriteOnlyChange={handleFavoriteOnlyChange}
          sortBy={sortBy}
          onSortByChange={handleSortByChange}
          totalCount={memos.length}
        />

        <div className="mt-4">
          {isMobile ? (
            <MemoSearchCardList
              memos={memos}
              togglingIds={togglingIds}
              sortBy={sortBy}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <MemoSearchTable
              memos={memos}
              togglingIds={togglingIds}
              onEdit={setEditingMemo}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="glass border-white/10 text-[#94a3b8] hover:text-[#f1f5f9] hover:border-white/20"
            >
              {isLoadingMore ? "読み込み中..." : "さらに読み込む"}
            </Button>
          </div>
        )}
      </main>

      {/* PC：メモ編集モーダル */}
      {!isMobile && (
        <MemoEditModal
          memo={editingMemo}
          open={editingMemo !== null}
          onOpenChange={(open) => { if (!open) setEditingMemo(null) }}
          onSuccess={(updated) => handleMemoUpdated({ ...editingMemo!, ...updated })}
          onDelete={handleMemoDeleted}
          tagSuggestions={tagSuggestions}
        />
      )}
    </div>
  )
}
