import { BookMarked, BookOpen, FileText, Star } from "lucide-react"
import type { HomeSummary } from "@/features/home/actions"

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
}

function StatCard({ icon, label, value, unit }: StatCardProps) {
  return (
    <div className="glass rounded-lg px-4 py-3 flex items-center gap-3 flex-1 min-w-0">
      <div className="shrink-0 text-[#94a3b8]">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[#94a3b8] truncate">{label}</p>
        <p className="text-lg font-semibold text-[#f1f5f9] leading-tight">
          {value.toLocaleString()}
          <span className="text-xs font-normal text-[#94a3b8] ml-0.5">{unit}</span>
        </p>
      </div>
    </div>
  )
}

interface HomeSummaryBarProps {
  summary: HomeSummary
}

export function HomeSummaryBar({ summary }: HomeSummaryBarProps) {
  return (
    // PC: 横1列4カード / スマホ: 2×2グリッド
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<BookMarked className="h-4 w-4" />}
        label="読書中"
        value={summary.readingBookCount}
        unit="冊"
      />
      <StatCard
        icon={<BookOpen className="h-4 w-4" />}
        label="総書籍数"
        value={summary.totalBooks}
        unit="冊"
      />
      <StatCard
        icon={<FileText className="h-4 w-4" />}
        label="総メモ数"
        value={summary.totalMemos}
        unit="件"
      />
      <StatCard
        icon={<Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
        label="お気に入り"
        value={summary.favoriteMemoCount}
        unit="件"
      />
    </div>
  )
}
