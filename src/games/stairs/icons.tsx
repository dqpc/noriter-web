export function TurnIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M36 18a14 14 0 0 0-24-6" />
      <path d="M12 6v8h8" />
      <path d="M12 30a14 14 0 0 0 24 6" />
      <path d="M36 42v-8h-8" />
    </svg>
  )
}

export function ClimbIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M24 40V10" />
      <path d="M12 22l12-12 12 12" />
    </svg>
  )
}
