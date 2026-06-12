export type ActionError = {
  code: "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "DB_ERROR" | "UNKNOWN"
  message: string
}

export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError }
