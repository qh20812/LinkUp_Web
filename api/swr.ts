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
