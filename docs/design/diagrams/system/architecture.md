# システム構成図（Mermaid）

設計書: [§1 システム構成設計](../../design/architecture/overview.md)

```mermaid
flowchart LR

    User[ユーザー]

    subgraph Vercel
        Front[Next.js App\nReact + TypeScript]
    end

    subgraph Supabase
        Auth[Authentication]
        DB[(PostgreSQL)]
    end

    User -->|Browser/HTTPS| Front

    Front -->|HTTPS| Auth
    Front -->|HTTPS| DB

```