"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Menu,
  Home,
  BookOpen,
  FileText,
  Star,
  Settings,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { signOut } from "@/features/auth/actions"

type HeaderProps = {
  userName: string
}

const navItems = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/books", label: "書籍一覧", icon: BookOpen },
  { href: "/memos", label: "全メモ検索", icon: FileText },
  { href: "/favorites", label: "お気に入り", icon: Star },
]

export function Header({ userName }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
      router.push("/login")
    })
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-semibold text-foreground tracking-tight">
            memoLake
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "text-primary bg-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop User Dropdown */}
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                disabled={isPending}
                className="flex items-center gap-1 text-sm text-foreground hover:bg-white/10"
              >
                {userName}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass bg-slate-900/95 border-white/10">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  設定
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isPending}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Hamburger */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild className="md:hidden">
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
                    onClick={() => setIsDrawerOpen(false)}
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
                onClick={() => setIsDrawerOpen(false)}
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
      </div>
    </header>
  )
}
