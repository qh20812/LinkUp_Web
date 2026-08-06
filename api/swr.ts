import { SWRConfiguration, mutate } from 'swr'
import { request } from './api'

export async function swrFetcher<T = unknown>(url: string): Promise<T> {
  return request<T>(url)
}

export const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
  revalidateIfStale: false,
  errorRetryCount: 2,
  shouldRetryOnError: false,
}

export function invalidate(prefix: string) {
  return mutate(
    (key: string | undefined | null): boolean =>
      typeof key === 'string' && key.startsWith(prefix),
    undefined,
    { revalidate: true },
  )
}

// Purges every cached entry (no refetch). Call on auth transitions so one
// account's data never leaks into another account's session.
export function clearSWRCache() {
  return mutate(() => true, undefined, { revalidate: false })
}
