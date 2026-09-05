export function IconStairs({ size = 56 }: { size?: number }) {
  const steps = [
    [8, 50],
    [20, 40],
    [32, 30],
    [20, 20],
    [32, 10],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="계단">
      <rect width="64" height="64" rx="10" fill="#1e2a3a" />
      {steps.map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="22" height="10" rx="2" fill={i === 3 ? '#f59e0b' : '#5b6b7a'} />
          <rect x={x} y={y} width="22" height="3" rx="1.5" fill={i === 3 ? '#fbbf24' : '#9fb3c8'} />
        </g>
      ))}
      <circle cx="43" cy="22" r="5" fill="#fde68a" />
    </svg>
  )
}
