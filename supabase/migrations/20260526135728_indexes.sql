-- ============================================================
-- 003_indexes.sql
-- インデックス作成
--
-- 依存: 001_extensions.sql（pg_trgm）、002_tables.sql（テーブル）
-- 参照: 設計書 §4.5 インデックス設計
-- ============================================================


-- ------------------------------------------------------------
-- books
-- ------------------------------------------------------------

-- ユーザー別取得（RLS + getBooks の主フィルタ）
CREATE INDEX idx_books_user_id
    ON books(user_id);

-- ユーザー × 読書状態検索（getBooks の status フィルタ）
CREATE INDEX idx_books_user_status
    ON books(user_id, status);

-- 書籍タイトル部分一致検索（pg_trgm + GIN）
CREATE INDEX idx_books_title_trgm
    ON books
    USING gin (title gin_trgm_ops);

-- 著者名部分一致検索（pg_trgm + GIN）
CREATE INDEX idx_books_author_trgm
    ON books
    USING gin (author gin_trgm_ops);


-- ------------------------------------------------------------
-- reading_memos
-- ------------------------------------------------------------

-- ユーザー別取得
CREATE INDEX idx_memos_user_id
    ON reading_memos(user_id);

-- 書籍別取得
CREATE INDEX idx_memos_book_id
    ON reading_memos(book_id);

-- ユーザー × 書籍取得（書籍詳細画面のメモ一覧）
CREATE INDEX idx_memos_user_book
    ON reading_memos(user_id, book_id);

-- ユーザー × お気に入り検索（favoriteOnly フィルタ）
CREATE INDEX idx_memos_user_favorite
    ON reading_memos(user_id, favorite);

-- ユーザー × 新着順表示（created_at DESC ソート）
CREATE INDEX idx_memos_user_created_at
    ON reading_memos(user_id, created_at DESC);

-- メモ内容の部分一致検索（pg_trgm + GIN）
CREATE INDEX idx_memos_content_trgm
    ON reading_memos
    USING gin (content gin_trgm_ops);


-- ------------------------------------------------------------
-- tags
-- ------------------------------------------------------------

-- ユーザー別タグ取得
CREATE INDEX idx_tags_user_id
    ON tags(user_id);

-- タグ名検索
CREATE INDEX idx_tags_name
    ON tags(name);

-- タグ名部分一致検索（pg_trgm + GIN）
CREATE INDEX idx_tags_name_trgm
    ON tags
    USING gin (name gin_trgm_ops);


-- ------------------------------------------------------------
-- memo_tags
-- ------------------------------------------------------------

-- タグ → メモ取得
CREATE INDEX idx_memo_tags_tag_id
    ON memo_tags(tag_id);