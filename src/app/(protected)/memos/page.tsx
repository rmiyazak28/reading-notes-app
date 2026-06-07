import { searchMemos, getTags } from "@/features/memos/actions"
import { MemoSearchPage } from "@/features/memos/components/memo-search-page"

type SearchParams = Promise<{ q?: string; favorite?: string; sort?: string }>

export default async function MemosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const query = params.q ?? ""
  const favoriteOnly = params.favorite === "1"
  const sortBy = params.sort === "updated_at" ? "updated_at" : "created_at"

  const [memosResult, tagsResult] = await Promise.all([
    searchMemos({ query, favoriteOnly, sortBy, limit: 50, offset: 0 }),
    getTags(),
  ])

  if (memosResult.error) throw new Error(memosResult.error.message)

  return (
    <MemoSearchPage
      initialMemos={memosResult.data}
      initialQuery={query}
      initialFavoriteOnly={favoriteOnly}
      initialSortBy={sortBy}
      tagSuggestions={tagsResult.data ?? []}
    />
  )
}
