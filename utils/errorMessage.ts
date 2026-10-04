/**
 * Chuyển lỗi (Error object từ SWR/request hay string state) thành chuỗi an toàn
 * để render trong JSX. Render trực tiếp Error object sẽ gây crash React
 * "Objects are not valid as a React child".
 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || String(err)
  if (typeof err === 'string') return err
  if (err === null || err === undefined) return ''
  return String(err)
}
