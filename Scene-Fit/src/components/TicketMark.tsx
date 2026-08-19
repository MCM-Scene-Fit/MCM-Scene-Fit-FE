export function TicketBarcode({ label }: { label: string }) {
  const bars = [1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 4]
  return (
    <div className="ticket-barcode" aria-hidden="true">
      <div className="ticket-barcode__bars">
        {bars.map((width, index) => (
          <span key={`${width}-${index}`} style={{ flex: width }} />
        ))}
      </div>
      <p>{label}</p>
    </div>
  )
}

export function TicketQr({ seed }: { seed: string }) {
  const cells = 13
  const bits: boolean[] = []
  let hash = 0
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  for (let i = 0; i < cells * cells; i += 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const x = i % cells
    const y = Math.floor(i / cells)
    const finder =
      (x < 3 && y < 3) || (x > cells - 4 && y < 3) || (x < 3 && y > cells - 4)
    bits.push(finder ? (x + y) % 2 === 0 : hash % 3 !== 0)
  }

  return (
    <svg className="ticket-qr" viewBox={`0 0 ${cells} ${cells}`} aria-hidden="true">
      {bits.map((on, index) =>
        on ? (
          <rect
            key={index}
            x={index % cells}
            y={Math.floor(index / cells)}
            width="1"
            height="1"
          />
        ) : null,
      )}
    </svg>
  )
}
