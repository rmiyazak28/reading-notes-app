import type { ReadingStatus } from "@/lib/books"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: ReadingStatus
  className?: string
}

const statusConfig: Record<
  ReadingStatus,
  { label: string; className: string }
> = {
  unread: {
    label: "未読",
    className: "bg-slate-600/50 text-slate-200",
  },
  reading: {
    label: "読書中",
    className: "bg-teal-500/20 text-teal-200 border-l-2 border-teal-400",
  },
  completed: {
    label: "読了",
    className: "bg-blue-500/20 text-blue-200",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
