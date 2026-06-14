"use client"

import { useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  BookOpen,
  FileText,
  Settings,
  LogOut,
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
import { cn } from "@/lib/utils"
import { signOut } from "@/features/auth/actions"
import { NavigationDrawer } from "@/components/layout/navigation-drawer"

type HeaderProps = {
  userName: string
}

const navItems = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/books", label: "書籍一覧", icon: BookOpen },
  { href: "/memos", label: "全メモ検索", icon: FileText },
]

export function Header({ userName }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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
          <Image src="/icon-192.png" alt="memoLake logo" width={32} height={32} className="rounded-lg" />
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
        <NavigationDrawer userName={userName} triggerClassName="md:hidden" />
      </div>
    </header>
  )
}
