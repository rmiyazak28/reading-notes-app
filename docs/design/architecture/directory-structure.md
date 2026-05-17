# 2. ディレクトリ設計

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # SCR-01
│   │   └── register/page.tsx       # SCR-02
│   │
│   ├── (protected)/
│   │   ├── layout.tsx              # 認証チェック共通レイアウト
│   │   ├── page.tsx                # SCR-03 ホーム
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── books/
│   │   │   ├── page.tsx            # SCR-04 書籍一覧
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # SCR-05 書籍詳細
│   │   │       └── edit/page.tsx   # SCR-06 書籍編集
│   │   ├── memos/
│   │   │   ├── page.tsx            # SCR-08 全読書メモ検索
│   │   │   └── [id]/edit/page.tsx  # SCR-07 読書メモ編集
│   │   ├── favorites/page.tsx      # SCR-10 お気に入りメモ一覧
│   │   └── settings/page.tsx       # SCR-09 設定
│   │   
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts   # Supabase OAuth callback
│   │   
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── common/
│
├── features/
│   ├── books/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   └── types/
│   │
│   ├── memos/ 
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   └── types/
│   │
│   └── auth/
│       ├── components/
│       ├── hooks/
│       └── types/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # ブラウザ（Client Component）用Supabaseクライアント
│   │   ├── server.ts           # Server Component / Server Actions用クライアント
│   │   └── middleware.ts       # Next.js Middlewareでのセッション更新用
│   ├── validations/
│   └── utils/
│
├── hooks/
├── constants/
├── types/
└── middleware.ts
```
