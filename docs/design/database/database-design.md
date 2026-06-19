# 4. DB設計

## 4.1 ER図

→ [diagrams/database/er-diagram.md](../../diagrams/database/er-diagram.md) を参照

---

# 4.2 テーブル一覧

| テーブル名 | 用途 |
|---|---|
| books | 書籍情報 |
| reading_memos | 読書メモ |
| tags | タグ |
| memo_tags | メモ・タグ中間テーブル |

---

# 4.3 テーブル定義

---

## books

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| id | uuid | ○ | - | ○ | 書籍ID |
| user_id | uuid | - | auth.users.id | ○ | 所有ユーザー |
| title | varchar(255) | - | - | ○ | 書籍タイトル |
| author | varchar(255) | - | - | - | 著者名 |
| genre | varchar(100) | - | - | - | ジャンル |
| status | varchar(20) | - | - | ○ | DEFAULT 'unread' |
| completed_at | date | - | - | - | 読了日 |
| created_at | timestamptz | - | - | ○ | DEFAULT now() |
| updated_at | timestamptz | - | - | ○ | DEFAULT now() |

### 制約

```sql
CHECK (status IN ('unread', 'reading', 'completed'))
```

```sql
CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR
    (status IN ('unread', 'reading'))
)
```

### UNIQUE制約

同一タイトル重複防止：

```sql
UNIQUE (user_id, title)
```

### 外部キー

```sql
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE
```

---

## reading_memos

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| id | uuid | ○ | - | ○ | メモID |
| user_id | uuid | - | auth.users.id | ○ | 所有ユーザー |
| book_id | uuid | - | books.id | ○ | 対象書籍 |
| page_number | integer | - | - | - | ページ番号 |
| content | text | - | - | ○ | メモ内容 |
| search_text | text | - | - | ○ | 全メモ検索用の非正規化カラム。content + 書籍タイトル + 著者名 + タグ名をスペース区切りで連結。トリガーで自動同期（§4.7）。アプリからは直接書き込まない |
| favorite | boolean | - | - | ○ | DEFAULT false |
| created_at | timestamptz | - | - | ○ | DEFAULT now() |
| updated_at | timestamptz | - | - | ○ | DEFAULT now() |

### 制約

```sql
CHECK (page_number IS NULL OR page_number > 0)
```

### 外部キー

```sql
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE
```

```sql
FOREIGN KEY (book_id)
REFERENCES books(id)
ON DELETE CASCADE
```

---

## tags

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| id | uuid | ○ | - | ○ | タグID |
| user_id | uuid | - | auth.users.id | ○ | 所有ユーザー |
| name | varchar(50) | - | - | ○ | タグ名 |
| created_at | timestamptz | - | - | ○ | DEFAULT now() |

### UNIQUE制約

```sql
UNIQUE (user_id, name)
```

### 外部キー

```sql
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE
```

---

## memo_tags

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| memo_id | uuid | ○ | reading_memos.id | ○ | メモID |
| tag_id | uuid | ○ | tags.id | ○ | タグID |

### 備考

- 複合主キー（memo_id, tag_id）

### 外部キー

```sql
FOREIGN KEY (memo_id)
REFERENCES reading_memos(id)
ON DELETE CASCADE
```

```sql
FOREIGN KEY (tag_id)
REFERENCES tags(id)
ON DELETE CASCADE
```

---

# 4.4 updated_at 自動更新トリガー

## 関数作成

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## books

```sql
CREATE TRIGGER trg_books_updated_at
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

---

## reading_memos

```sql
CREATE TRIGGER trg_reading_memos_updated_at
BEFORE UPDATE ON reading_memos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

---

# 4.5 インデックス設計

---

## books

### ユーザー別取得

```sql
CREATE INDEX idx_books_user_id
ON books(user_id);
```

### ユーザー × 読書状態検索

```sql
CREATE INDEX idx_books_user_status
ON books(user_id, status);
```

### 書籍タイトル部分一致検索（pg_trgm + GIN）

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_books_title_trgm
ON books
USING gin (title gin_trgm_ops);
```

### 著者名部分一致検索（pg_trgm + GIN）

```sql
CREATE INDEX idx_books_author_trgm
ON books
USING gin (author gin_trgm_ops);
```

---

## reading_memos

### ユーザー別取得

```sql
CREATE INDEX idx_memos_user_id
ON reading_memos(user_id);
```

### 書籍別取得

```sql
CREATE INDEX idx_memos_book_id
ON reading_memos(book_id);
```

### ユーザー × 書籍取得

```sql
CREATE INDEX idx_memos_user_book
ON reading_memos(user_id, book_id);
```

### ユーザー × お気に入り検索

```sql
CREATE INDEX idx_memos_user_favorite
ON reading_memos(user_id, favorite);
```

### ユーザー × 新着順表示

```sql
CREATE INDEX idx_memos_user_created_at
ON reading_memos(user_id, created_at DESC);
```

### 全文横断検索用カラムと GIN インデックス（search_text + pg_trgm）

メモ内容・書籍タイトル・著者名・タグ名を横断検索するため、`reading_memos` に非正規化カラム `search_text` を追加し、単一の GIN インデックスで検索する。

​```sql
ALTER TABLE reading_memos
ADD COLUMN search_text text;

CREATE INDEX idx_memos_search_text_trgm
ON reading_memos
USING gin (search_text gin_trgm_ops);
​```

`search_text` は `content` ・紐づく `books.title` ・`books.author` ・紐づく全 `tags.name` をスペース区切りで連結した文字列とし、後述のトリガーにより自動更新する（§4.6参照）。

---

## tags

### ユーザー別タグ取得

```sql
CREATE INDEX idx_tags_user_id
ON tags(user_id);
```

### タグ名検索

```sql
CREATE INDEX idx_tags_name
ON tags(name);
```

### タグ名部分一致検索（pg_trgm + GIN）

```sql
CREATE INDEX idx_tags_name_trgm
ON tags
USING gin (name gin_trgm_ops);
```

---

## memo_tags

### タグ → メモ取得
```sql
-- memo_id 単独インデックスは PRIMARY KEY (memo_id, tag_id) でカバーされるため不要。
-- tag_id は PK の 2 列目のため、単独検索用に別途定義する。
CREATE INDEX idx_memo_tags_tag_id
ON memo_tags(tag_id);
```

---

# 4.6 search_text 同期トリガー設計

---

## sync_memo_search_text（関数）

`reading_memos.search_text` を最新の `content` ・書籍情報・タグ情報で再計算し更新する。

```sql
CREATE OR REPLACE FUNCTION sync_memo_search_text(p_memo_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE reading_memos m
    SET search_text = trim(
        coalesce(m.content, '') || ' ' ||
        coalesce(b.title, '') || ' ' ||
        coalesce(b.author, '') || ' ' ||
        coalesce((
            SELECT string_agg(t.name, ' ')
            FROM memo_tags mt
            JOIN tags t ON t.id = mt.tag_id
            WHERE mt.memo_id = m.id
        ), '')
    )
    FROM books b
    WHERE m.book_id = b.id
      AND m.id = p_memo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## 同期トリガー一覧

| トリガー対象 | イベント | 動作 |
|---|---|---|
| `reading_memos` | INSERT, UPDATE OF content, book_id | 自身の `search_text` を再計算 |
| `books` | UPDATE OF title, author | 紐づく全メモの `search_text` を再計算 |
| `memo_tags` | INSERT, DELETE | 対象メモの `search_text` を再計算 |
| `tags` | UPDATE OF name | 紐づく全メモの `search_text` を再計算 |

各トリガーは `sync_memo_search_text(memo_id)` を該当メモ分呼び出すラッパー関数として実装する（具体的なトリガー関数定義は実装時にマイグレーションファイルへ記述する）。

### 検索方式の変更点

- 検索は `reading_memos.search_text ILIKE '%query%'` の単一条件となり、RPC関数（旧 `search_memos`）は廃止する
- Server Action（`searchMemos`）は PostgREST の標準クエリ（`.ilike()` / `.or()` 不要）で直接 `reading_memos` を検索できる（§5.2参照）
- 旧方式で発生していた「複数テーブルJOINのOR条件によりGINインデックスが使われない」問題は、検索対象が単一テーブル・単一カラムになることで解消される