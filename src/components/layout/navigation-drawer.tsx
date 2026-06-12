"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, User, Home, BookOpen, FileText, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { signOut } from "@/features/auth/actions"

const navItems = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/books", label: "書籍一覧", icon: BookOpen },
  { href: "/memos", label: "全メモ検索", icon: FileText },
]

type Props = {
  userName: string
  triggerClassName?: string
}

export function NavigationDrawer({ userName, triggerClassName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
      router.push("/login")
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className={triggerClassName}>
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/10">
          <Menu className="h-5 w-5" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="glass bg-slate-900/95 border-white/10 flex flex-col p-0">
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
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
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
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <Settings className="h-5 w-5" />
            設定
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            disabled={isPending}
            className="flex items-center gap-3 px-4 py-3 h-auto rounded-lg text-sm font-medium text-destructive hover:text-destructive hover:bg-white/5 justify-start"
          >
            <LogOut className="h-5 w-5" />
            ログアウト
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
