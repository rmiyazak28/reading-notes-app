-- ============================================================
-- 002_tables.sql
-- テーブル作成
--
-- 依存: 001_extensions.sql（pg_trgm）
-- 参照: 設計書 §4.3 テーブル定義
--
-- 実装上の判断:
--   id のデフォルト値に gen_random_uuid() を使用。
--   uuid_generate_v4() は uuid-ossp 拡張が必要だが、
--   gen_random_uuid() は PostgreSQL 13+ に組み込みであり
--   Supabase 環境でも追加拡張なしで利用できるため採用。
--   参照: https://www.postgresql.org/docs/current/functions-uuid.html
-- ============================================================


-- ------------------------------------------------------------
-- books
-- ------------------------------------------------------------
CREATE TABLE books (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title        varchar(255) NOT NULL,
    author       varchar(255),
    genre        varchar(100),
    status       varchar(20)  NOT NULL DEFAULT 'unread',
    completed_at date,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now(),

    -- 読書状態は3値のみ許可
    CONSTRAINT chk_books_status
        CHECK (status IN ('unread', 'reading', 'completed')),

    -- 読了状態のときは読了日が必須。未読・読書中のときは読了日不要。
    CONSTRAINT chk_books_completed_at
        CHECK (
            (status = 'completed' AND completed_at IS NOT NULL)
            OR (status IN ('unread', 'reading'))
        ),

    -- 同一ユーザー内でのタイトル重複防止
    CONSTRAINT uq_books_user_title
        UNIQUE (user_id, title)
);


-- ------------------------------------------------------------
-- reading_memos
-- ------------------------------------------------------------
CREATE TABLE reading_memos (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id     uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    page_number integer,
    content     text        NOT NULL,
    favorite    boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    -- ページ数は 1 以上のみ許可（NULL は「ページ指定なし」として許容）
    CONSTRAINT chk_reading_memos_page_number
        CHECK (page_number IS NULL OR page_number > 0)
);


-- ------------------------------------------------------------
-- tags
-- ------------------------------------------------------------
CREATE TABLE tags (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       varchar(50) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    -- 同一ユーザー内でのタグ名重複防止
    CONSTRAINT uq_tags_user_name
        UNIQUE (user_id, name)
);


-- ------------------------------------------------------------
-- memo_tags（中間テーブル）
-- ------------------------------------------------------------
CREATE TABLE memo_tags (
    memo_id uuid NOT NULL REFERENCES reading_memos(id) ON DELETE CASCADE,
    tag_id  uuid NOT NULL REFERENCES tags(id)          ON DELETE CASCADE,

    -- 複合主キー（memo_id, tag_id）
    PRIMARY KEY (memo_id, tag_id)
);