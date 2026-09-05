export function IconYut({ size = 56 }: { size?: number }) {
  const sticks = [
    [14, 12, -14],
    [26, 10, -6],
    [38, 10, 6],
    [50, 12, 14],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="윷놀이">
      <rect width="64" height="64" rx="10" fill="#3b2a1a" />
      {sticks.map(([x, y, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} 32)`}>
          <rect
            x={x - 4}
            y={y}
            width="8"
            height="40"
            rx="4"
            fill={i % 2 === 0 ? '#e7d3b0' : '#c9a97a'}
            stroke="#1c1917"
            strokeWidth="1.5"
          />
          {i === 0 && <circle cx={x} cy={y + 8} r="1.6" fill="#1c1917" />}
        </g>
      ))}
    </svg>
  )
}
