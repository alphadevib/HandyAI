import { useId } from 'react'

/**
 * The HandyAI mark: an "H" whose crossbar curves like a handle and whose right stem is capped by
 * an AI spark. Same artwork as public/favicon.svg.
 */
export function BrandMark({ size = 36, className }) {
  const gradient = useId()
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradient} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14532D" />
          <stop offset="0.55" stopColor="#3F7A12" />
          <stop offset="1" stopColor="#A3E635" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${gradient})`} />
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="6.5">
        <path d="M20 17v31" />
        <path d="M44 31v17" />
        <path d="M20 35c5 5.5 19 5.5 24 0" />
      </g>
      <path
        fill="#fff"
        d="M44 6.5c.9 4.6 2.9 6.6 7.5 7.5-4.6.9-6.6 2.9-7.5 7.5-.9-4.6-2.9-6.6-7.5-7.5 4.6-.9 6.6-2.9 7.5-7.5z"
      />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Handy<span className="wordmark-ai">AI</span>
    </span>
  )
}
