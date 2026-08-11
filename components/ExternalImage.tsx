import React, { type ImgHTMLAttributes } from 'react'

interface ExternalImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  alt: string
}

// eslint-disable-next-line @next/next/no-img-element
const ExternalImage = ({ alt, ...props }: ExternalImageProps) => <img alt={alt} {...props} />

export default ExternalImage
