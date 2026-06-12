"use client"

import { Star } from "lucide-react"
import { SearchBar } from "@/components/common/search-bar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MemoSearchFiltersProps {
  query: string
  onQueryChange: (v: string) => void
  favoriteOnly: boolean
  onFavoriteOnlyChange: (v: boolean) => void
  sortBy: "created_at" | "updated_at"
  onSortByChange: (v: "created_at" | "updated_at") => void
  totalCount: number
}

export function MemoSearchFilters({
  query,
  onQueryChange,
  favoriteOnly,
  onFavoriteOnlyChange,
  sortBy,
  onSortByChange,
  totalCount,
}: MemoSearchFiltersProps) {
  return (
    <div className="sticky top-16 z-40 pt-4 pb-3 -mx-4 px-4 bg-transparent backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-sm">
          <SearchBar
            value={query}
            onChange={onQueryChange}
            placeholder="メモ内容・書籍名・著者・タグで検索..."
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* お気に入りフィルタ */}
          <button
            onClick={() => onFavoriteOnlyChange(!favoriteOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              favoriteOnly
                ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                : "glass border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
            }`}
            aria-pressed={favoriteOnly}
          >
            <Star className={`h-3.5 w-3.5 ${favoriteOnly ? "fill-amber-400 text-amber-400" : ""}`} />
            お気に入りのみ
          </button>

          {/* ソート */}
          <Select value={sortBy} onValueChange={(v) => onSortByChange(v as "created_at" | "updated_at")}>
            <SelectTrigger className="w-fit glass border-white/10 bg-white/5 text-muted-foreground text-xs h-8 gap-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass bg-slate-900/95 border-white/10">
              <SelectItem value="created_at" className="text-foreground focus:bg-white/10 text-xs">
                登録日順
              </SelectItem>
              <SelectItem value="updated_at" className="text-foreground focus:bg-white/10 text-xs">
                更新日順
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SCR-04・SCR-05に合わせて件数をstickyエリア内の検索バー下に表示 */}
      <div className="mt-2">
        <span className="text-sm">
          <span className="text-lake-accent font-medium">{totalCount}</span>
          <span className="text-foreground-secondary"> 件</span>
        </span>
      </div>
    </div>
  )
}
