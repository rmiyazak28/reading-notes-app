import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onAddBook?: () => void
}

export function EmptyState({ onAddBook }: EmptyStateProps) {
  return (
    <div className="glass rounded-lg p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        まだ書籍が登録されていません
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        最初の書籍を追加して、読書記録を始めましょう。
        思考や引用、感想を湖のように蓄積していきます。
      </p>
      {onAddBook && (
        <Button
          onClick={onAddBook}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          書籍を追加
        </Button>
      )}
    </div>
  )
}
