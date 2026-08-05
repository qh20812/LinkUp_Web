import React from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  return <ResetPasswordForm initialToken={params.token ?? null} />
}
