export interface PricingInput {
  basePrice: number
  startTime: Date
  demandIndex: number   // 0.0 – 1.0
  dMax: number          // e.g. 0.40
  dCancelActive: boolean
  dCancelExpiry?: Date
}

export interface PricingResult {
  currentPrice: number
  dLead: number
  dPeak: number
  dCancel: number
  dTotal: number
  hoursRemaining: number
}

export function calculatePrice(input: PricingInput): PricingResult {
  const now = new Date()
  const hoursRemaining = (input.startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  // D_lead — step function based on hours remaining
  let dLead = 0
  if      (hoursRemaining < 2)  dLead = 0.25
  else if (hoursRemaining < 6)  dLead = 0.20
  else if (hoursRemaining < 12) dLead = 0.15
  else if (hoursRemaining < 24) dLead = 0.10
  else                          dLead = 0.00

  // D_peak — inverse of demand index
  const dPeakMax = 0.15
  const dPeak = dPeakMax * (1 - input.demandIndex)

  // D_cancel — only active if within expiry window
  const dCancel =
    input.dCancelActive &&
    input.dCancelExpiry &&
    now < input.dCancelExpiry
      ? 0.15
      : 0

  // Cap at D_max
  const dTotal = Math.min(dLead + dPeak + dCancel, input.dMax)

  const currentPrice = Math.round(input.basePrice * (1 - dTotal))

  return { currentPrice, dLead, dPeak, dCancel, dTotal, hoursRemaining }
}
