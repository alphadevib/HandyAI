/** One presentation for every inline error/success note, so nothing looks bolted on. */
export default function Message({ tone = 'error', children }) {
  if (!children) return null
  return (
    <p className={`message message-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
