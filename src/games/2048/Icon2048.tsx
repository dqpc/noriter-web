export function Icon2048({ size = 56 }: { size?: number }) {
  const tiles: Array<[string, string, string]> = [
    ['#eee4da', '#776e65', '2'],
    ['#f2b179', '#f9f6f2', '8'],
    ['#4fb286', '#f9f6f2', '256'],
    ['#e84393', '#f9f6f2', '2048'],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="2048">
      <rect width="64" height="64" rx="10" fill="#5c554f" />
      {tiles.map(([bg, fg, label], i) => {
        const x = 4 + (i % 2) * 29
        const y = 4 + Math.floor(i / 2) * 29
        return (
          <g key={label}>
            <rect x={x} y={y} width="27" height="27" rx="4" fill={bg} />
            <text
              x={x + 13.5}
              y={y + 14}
              fontSize={label.length > 2 ? 9 : 13}
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
              fill={fg}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
