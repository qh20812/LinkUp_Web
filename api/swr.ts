import { SWRConfiguration, mutate } from 'swr'
import { request } from './api'

export async function swrFetcher<T = unknown>(url: string): Promise<T> {
  return request<T>(url)
}

export const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 3000,
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
