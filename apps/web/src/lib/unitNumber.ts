// Increments the trailing number in a unit number string.
// This is extracted as a pure utility function so it can be
// tested in complete isolation with no dependencies.
//
// Examples:
//   W-14    → W-15
//   W-01    → W-2
//   TG-05   → TG-6
//   TG-09   → TG-10
//   A.3     → A.4
//   42      → 43
//   W-999   → W-1000
//   Unit 5  → Unit 6
//   ROOF    → ROOF-copy  (no trailing number found)
export function incrementUnitNumber(unitNumber: string): string {
  const match = unitNumber.match(/^(.*?)(\d+)$/)
  if (!match) return `${unitNumber}-copy`
  const prefix = match[1]
  const num    = parseInt(match[2], 10)
  return `${prefix}${num + 1}`
}
 