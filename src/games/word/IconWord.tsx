export function IconWord({ size = 56 }: { size?: number }) {
  const rows: Array<Array<[string, string]>> = [
    [
      ['#3f3a36', 'ㅇ'],
      ['#c9b458', 'ㅣ'],
      ['#3f3a36', 'ㅂ'],
    ],
    [
      ['#6aaa64', 'ㅅ'],
      ['#6aaa64', 'ㅜ'],
      ['#c9b458', 'ㄹ'],
    ],
    [
      ['#6aaa64', 'ㅇ'],
      ['#6aaa64', 'ㅣ'],
      ['#6aaa64', 'ㅂ'],
    ],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="글딱지">
      <rect width="64" height="64" rx="10" fill="#1c1917" />
      {rows.map((row, r) =>
        row.map(([bg, ch], c) => {
          const x = 5 + c * 19
          const y = 5 + r * 19
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width="16" height="16" rx="3" fill={bg} />
              <text
                x={x + 8}
                y={y + 8.5}
                fontSize="10"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
                fill="#fafaf9"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {ch}
              </text>
            </g>
          )
        }),
      )}
    </svg>
  )
}
