import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const OTHER = '__other__'

let cached = null

/** Loads the profession and industry lists once per page load, shared by every select. */
function useProfessionLists() {
  const [lists, setLists] = useState(cached)
  useEffect(() => {
    if (cached) return undefined
    const controller = new AbortController()
    api
      .professions(controller.signal)
      .then((result) => {
        cached = result
        setLists(result)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return lists
}

/**
 * A grouped selection box of professions (or industries, for organisations) with an "Other"
 * option that reveals a text box, so nobody is forced into a label that does not fit.
 */
export default function ProfessionSelect({ value, onChange, kind = 'profession', id, invalid }) {
  const lists = useProfessionLists()
  const entries = useMemo(
    () => (kind === 'industry' ? lists?.industries : lists?.professions) ?? [],
    [kind, lists],
  )
  const groups = useMemo(() => {
    const byGroup = new Map()
    for (const entry of entries) {
      if (!byGroup.has(entry.group)) byGroup.set(entry.group, [])
      byGroup.get(entry.group).push(entry)
    }
    return [...byGroup.entries()]
  }, [entries])

  const known = entries.some((entry) => entry.name === value)
  const [otherChosen, setOtherChosen] = useState(false)
  const showOther = otherChosen || (Boolean(value) && entries.length > 0 && !known)
  const selectValue = showOther ? OTHER : value || ''

  const label = kind === 'industry' ? 'industry' : 'profession'

  return (
    <div className="profession-select">
      <select
        id={id}
        value={selectValue}
        aria-invalid={invalid}
        onChange={(event) => {
          if (event.target.value === OTHER) {
            setOtherChosen(true)
            onChange('')
          } else {
            setOtherChosen(false)
            onChange(event.target.value)
          }
        }}
        required
      >
        <option value="" disabled>
          {lists ? `Choose your ${label}…` : 'Loading…'}
        </option>
        {groups.length === 1
          ? groups[0][1].map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.name}
              </option>
            ))
          : groups.map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </optgroup>
            ))}
        <option value={OTHER}>Other (type it in)</option>
      </select>
      {showOther && (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Your ${label}`}
          maxLength={120}
          aria-label={`Your ${label}`}
          autoFocus={otherChosen}
        />
      )}
    </div>
  )
}
