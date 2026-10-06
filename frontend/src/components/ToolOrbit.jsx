import { useEffect, useState } from 'react'
import { BrandMark } from './Brand'
import ToolLogo from './ToolLogo'

const PER_RING = 8
const REVOLUTION_MS = 60_000

/**
 * The hero's ring of tool logos around the HandyAI mark. The ring makes one full turn a minute
 * (CSS keeps the logos upright), and after every turn the next eight tools in the catalogue take
 * the places, so a visitor who lingers sees the whole marketplace go round.
 */
export default function ToolOrbit({ tools }) {
  const [turn, setTurn] = useState(0)

  // One timer started with the ring, so a swap lands as the ring completes a revolution.
  useEffect(() => {
    if (tools.length <= PER_RING) return undefined
    const timer = setInterval(() => setTurn((value) => value + 1), REVOLUTION_MS)
    return () => clearInterval(timer)
  }, [tools.length])

  // Wrap around the catalogue so every ring is full, whatever the number of tools.
  const ring = tools.length
    ? Array.from({ length: Math.min(PER_RING, tools.length) }, (_, index) =>
        tools[(turn * PER_RING + index) % tools.length])
    : []

  return (
    <div className="hero-orbit" aria-hidden="true">
      <span className="orbit-ring" />
      <span className="orbit-ring orbit-ring-2" />
      <span className="orbit-core">
        <BrandMark size={84} />
      </span>
      <div className="orbit-track">
        {ring.map((tool, index) => (
          <span key={index} className="orbit-tile" style={{ '--i': index, '--n': ring.length }}>
            <span className="orbit-upright">
              {/* Keyed by tool, so each newcomer pops in as the ring swaps. */}
              <span key={`${turn}-${tool.slug}`} className="orbit-pill">
                <ToolLogo tool={tool} size={42} />
                <span className="orbit-name">{tool.name}</span>
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
