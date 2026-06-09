export interface Tag {
  id: string
  name: string
}

// UI上の表現。idなしは新規作成予定のタグ（DB未登録）
export type TagEntry =
  | { id: string; name: string }
  | { id?: undefined; name: string }

export interface Memo {
  id: string
  user_id: string
  book_id: string
  page_number: number | null
  content: string
  favorite: boolean
  created_at: string
  updated_at: string
}

export interface MemoWithTags extends Memo {
  tags: Tag[]
}

export interface MemoWithBook extends MemoWithTags {
  book_title: string
  book_author: string | null
}
