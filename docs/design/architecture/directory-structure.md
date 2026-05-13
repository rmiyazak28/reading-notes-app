# 2. ディレクトリ設計

```text
src/
├── app/
│   ├── (auth)/
│   ├── (protected)/
│   ├── api/
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
│   └── auth/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   │
│   ├── validations/
│   └── utils/
│
├── hooks/
├── constants/
├── types/
└── middleware.ts
```
