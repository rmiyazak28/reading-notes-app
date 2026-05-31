export interface Tag {
  id: string
  name: string
}

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
