import React from 'react'
import OpenAppClient from './OpenAppClient'

export default async function OpenAppPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const params = await searchParams
  return <OpenAppClient redirect={params.redirect ?? null} />
}
