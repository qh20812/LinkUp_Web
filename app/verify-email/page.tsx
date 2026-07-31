import React from 'react'
import VerifyEmailForm from './VerifyEmailForm'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const params = await searchParams
  return <VerifyEmailForm initialToken={params.token ?? null} initialEmail={params.email ?? null} />
}
