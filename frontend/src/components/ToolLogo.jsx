import { useState } from 'react'

const MONOGRAM_COLOURS = ['#5b3df5', '#0f766e', '#c2410c', '#be185d', '#1d4ed8', '#7c3aed']

/** The platform's own logo, falling back to a coloured monogram if the image cannot load. */
export default function ToolLogo({ tool, size = 48 }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }

  if (!tool.logoUrl || failed) {
    const colour = MONOGRAM_COLOURS[(tool.name.charCodeAt(0) ?? 0) % MONOGRAM_COLOURS.length]
    return (
      <span className="tool-logo tool-logo-monogram" style={{ ...style, background: colour }} aria-hidden="true">
        {tool.name.slice(0, 1)}
      </span>
    )
  }

  return (
    <span className="tool-logo" style={style}>
      <img
        src={tool.logoUrl}
        alt={`${tool.name} logo`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  )
}
