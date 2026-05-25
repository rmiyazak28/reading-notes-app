# 2. ディレクトリ設計

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # SCR-01
│   │   └── signup/page.tsx       # SCR-02
│   │
│   ├── (protected)/
│   │   ├── layout.tsx              # 認証済みユーザー共通レイアウト
│   │   ├── home/
│   │   │   ├── page.tsx            # SCR-03 ホーム
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── books/
│   │   │   ├── page.tsx            # SCR-04 書籍一覧
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # SCR-05 書籍詳細 ※[id]はbook_id
│   │   │       └── memo/
│   │   │           └── new/page.tsx  # SCR-07 読書メモ登録（スマホのみ）
│   │   ├── memos/
│   │   │   ├── page.tsx            # SCR-06 全読書メモ検索
│   │   │   └── [id]/
│   │   │       └── edit/page.tsx   # SCR-08 読書メモ編集（スマホのみ）※[id]はmemo_id
│   │   ├── favorites/page.tsx      # SCR-09 お気に入りメモ一覧
│   │   └── settings/page.tsx       # SCR-10 設定
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
│   │   └── proxy.ts            # Proxyでのセッション更新用（proxy関数を定義）
│   ├── validations/
│   └── utils/
│
├── hooks/
├── constants/
├── types/
└── proxy.ts                    # Next.js Proxyエントリポイント（lib/supabase/proxy.tsを呼び出す）
```