'use client'

import { useState, type ImgHTMLAttributes } from 'react'

interface ExternalImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  alt: string
}

const ExternalImage = ({
  alt,
  onError,
  onLoad,
  decoding = 'async',
  ...props
}: ExternalImageProps) => {
  const [error, setError] = useState(false)

  if (error) {
    return <i className="bx bxs-user" style={{ fontSize: 'inherit' }} />
  }

  return (
    <img
      alt={alt}
      decoding={decoding}
      onError={(e) => {
        setError(true)
        onError?.(e)
      }}
      onLoad={(e) => {
        setError(false)
        onLoad?.(e)
      }}
      {...props}
    />
  )
}

export default ExternalImage
