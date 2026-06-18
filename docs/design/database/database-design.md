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

### メモ全文部分一致検索（pg_trgm + GIN）

```sql
CREATE INDEX idx_memos_content_trgm
ON reading_memos
USING gin (content gin_trgm_ops);
```

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

# 4.6 RPC関数設計

---

## search_memos

全メモ横断検索（SCR-06）用のストアド関数。PostgREST の `.or()` は結合先テーブルのカラムを直接指定できないため、メモ内容・書籍名・著者名・タグ名の横断検索はRPC化が必須。DB側で `ILIKE` を使い GINインデックス（pg_trgm）を活用する。

### シグネチャ

```sql
CREATE OR REPLACE FUNCTION search_memos(
    p_user_id uuid,
    p_query text DEFAULT NULL,
    p_favorite_only boolean DEFAULT false,
    p_sort_by text DEFAULT 'created_at',
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    book_id uuid,
    page_number integer,
    content text,
    favorite boolean,
    created_at timestamptz,
    updated_at timestamptz,
    book_title text,
    book_author text,
    tags jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
```

### 引数

| 引数 | 型 | デフォルト | 説明 |
|---|---|---|---|
| p_user_id | uuid | - | 取得対象ユーザーID（Server Action側で認証済みユーザーのIDを渡す） |
| p_query | text | NULL | 検索キーワード。NULLまたは空文字の場合は検索条件なし |
| p_favorite_only | boolean | false | trueの場合はお気に入りのみ |
| p_sort_by | text | 'created_at' | ソートカラム（'created_at' または 'updated_at'） |
| p_limit | integer | 50 | 取得件数上限 |
| p_offset | integer | 0 | オフセット（ページネーション用） |

### 戻り値カラム

| カラム | 型 | 説明 |
|---|---|---|
| id〜updated_at | reading_memosの全カラム | メモ本体の情報 |
| book_title | text | 紐付き書籍のタイトル（books.titleのJOIN結果） |
| book_author | text（nullable） | 紐付き書籍の著者名（books.authorのJOIN結果） |
| tags | jsonb | タグの配列 `[{"id": "...", "name": "..."}]`。タグなしは空配列 `[]` |

### 検索条件

- `p_query` が指定された場合、以下のいずれかに `ILIKE '%p_query%'` でヒットするメモを返す
  - `reading_memos.content`
  - `books.title`
  - `books.author`
  - `tags.name`（EXISTS副問合せ経由）
- `SECURITY INVOKER` のため RLS はバイパスしない。加えて `WHERE reading_memos.user_id = p_user_id` を明示する

### 内部処理の分岐（p_queryの有無）

`p_query` の有無によって、内部のクエリ構造を分岐させる。`ORDER BY ... LIMIT` を検索条件と同じSELECTに含めると、プランナーが `idx_memos_user_created_at` を優先しGINインデックスが使われないことが実測で確認されたため（50,000件規模のEXPLAIN ANALYZE検証）、検索語ありの場合は一致行の確定とソート・ページングを段階的に分離する。

| 分岐 | 処理方式 | 使用される主インデックス |
|---|---|---|
| `p_query` が NULL または空文字 | `reading_memos` を `user_id` で絞り `created_at`/`updated_at` 順にスキャンし `LIMIT/OFFSET` | `idx_memos_user_created_at` |
| `p_query` が指定されている | まずCTEで `content`/`title`/`author`/`tags.name` への一致行を確定させ、その後にソート・ページングを行う | `idx_memos_content_trgm`、`idx_books_title_trgm`、`idx_books_author_trgm`、`idx_tags_name_trgm`（候補として使用されうる。実際の選択は一致件数の選択性に依存し、ヒット件数がテーブル全体に対して多い場合はSeq Scanが選ばれることもある） |

```sql
-- 検索語あり時のクエリ構造（概要）
WITH matched AS (
    SELECT m.id
    FROM reading_memos m
    JOIN books b ON m.book_id = b.id
    WHERE m.user_id = p_user_id
        AND (p_favorite_only = false OR m.favorite = true)
        AND (
            m.content ILIKE '%' || p_query || '%'
            OR b.title ILIKE '%' || p_query || '%'
            OR b.author ILIKE '%' || p_query || '%'
            OR EXISTS (
                SELECT 1 FROM memo_tags mt JOIN tags t ON mt.tag_id = t.id
                WHERE mt.memo_id = m.id AND t.name ILIKE '%' || p_query || '%'
            )
        )
)
SELECT ...
FROM matched
JOIN reading_memos m ON m.id = matched.id
JOIN books b ON m.book_id = b.id
ORDER BY CASE WHEN p_sort_by = 'updated_at' THEN m.updated_at ELSE m.created_at END DESC
LIMIT p_limit OFFSET p_offset;
```