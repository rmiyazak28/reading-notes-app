import { Header } from "@/components/layout/header"  // v0のheader.tsxを移動済みの想定

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  )
}