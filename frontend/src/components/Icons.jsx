/**
 * Line icons drawn for HandyAI: one per catalogue category, plus the few UI glyphs the pages
 * need. All are 24x24, stroke-based and inherit the text colour.
 */

const CATEGORY_PATHS = {
  coding: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M13.5 5l-3 14'],
  writing: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z', 'M13.5 6.5l4 4'],
  image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 2.5-2.5L20 17', 'M15.5 9.5h.01'],
  design: ['M12 3l7 7-7 11-7-11 7-7z', 'M12 3v8', 'M12 11a1.6 1.6 0 1 0 0 .01'],
  video: ['M4 6h11v12H4z', 'M15 10l5-3v10l-5-3'],
  audio: ['M4 10v4', 'M8 7v10', 'M12 4v16', 'M16 8v8', 'M20 11v2'],
  productivity: ['M13 3L5 13h6l-1 8 8-10h-6l1-8z'],
  meetings: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v5', 'M16 3v5', 'M8 14h3'],
  research: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.5 15.5L20 20'],
  data: ['M4 20h16', 'M6 16v-4', 'M10.5 16V8', 'M15 16v-6', 'M19.5 16V5'],
  marketing: ['M4 10v4h3l7 4V6L7 10H4z', 'M17 9a4 4 0 0 1 0 6', 'M7 14l1 5h2'],
  automation: [
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M12 2.5v3', 'M12 18.5v3', 'M2.5 12h3', 'M18.5 12h3',
    'M5.3 5.3l2.1 2.1', 'M16.6 16.6l2.1 2.1', 'M5.3 18.7l2.1-2.1', 'M16.6 7.4l2.1-2.1',
  ],
  chatbots: ['M5 5h14v10H10l-4 4v-4H5z', 'M9 10h.01', 'M12 10h.01', 'M15 10h.01'],
}

function Svg({ size = 24, children, className, label }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      {children}
    </svg>
  )
}

export function CategoryIcon({ slug, size, className }) {
  const paths = CATEGORY_PATHS[slug] ?? ['M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z']
  return (
    <Svg size={size} className={className}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </Svg>
  )
}

const UI_PATHS = {
  search: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.5 15.5L20 20'],
  mic: ['M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z', 'M5.5 11a6.5 6.5 0 0 0 13 0', 'M12 17.5V21'],
  send: ['M4 12l16-8-6 16-2.5-6.5L4 12z'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6'],
  plus: ['M12 5v14', 'M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  spark: ['M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  store: ['M4 9l1.5-5h13L20 9', 'M4 9h16v2.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 11.5z', 'M5.5 13.5V20h13v-6.5'],
  chat: ['M5 5h14v10H10l-4 4v-4H5z'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  wallet: ['M4 7h15a1 1 0 0 1 1 1v11H4z', 'M4 7l12-3v3', 'M16 13.5h.01'],
  shield: ['M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z', 'M9 12l2 2 4-4'],
  logout: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h10'],
  star: ['M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v5', 'M16 3v5'],
  filter: ['M4 5h16', 'M7 12h10', 'M10 19h4'],
}

export function Icon({ name, size, className, label }) {
  return (
    <Svg size={size} className={className} label={label}>
      {(UI_PATHS[name] ?? UI_PATHS.spark).map((d) => (
        <path key={d} d={d} />
      ))}
    </Svg>
  )
}
