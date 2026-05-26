-- ============================================================
-- 001_extensions.sql
-- 拡張機能の有効化
--
-- 依存: なし
-- 参照: 設計書 §4.5 インデックス設計（pg_trgm + GIN インデックス）
-- ============================================================

-- 部分一致検索（ILIKE / LIKE）の GIN インデックスを使用するために必要。
-- books.title / books.author / reading_memos.content / tags.name の
-- トライグラムインデックスで利用する。
-- Supabase（PostgreSQL）では標準で利用可能。
CREATE EXTENSION IF NOT EXISTS pg_trgm;