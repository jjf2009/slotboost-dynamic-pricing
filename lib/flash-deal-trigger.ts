/** Matches the 15-minute cron interval in vercel.json */
export const CRON_INTERVAL_HOURS = 15 / 60;

/**
 * FR-18: Send flash-deal alerts only when H crosses below 24 hours (D_lead
 * first activates) or crosses below 2 hours — not on every price drop.
 *
 * @param hoursRemaining - hours until slot start at the current cron tick
 * @param previousHoursRemaining - hours remaining at the previous tick; defaults
 *   to hoursRemaining + CRON_INTERVAL_HOURS when omitted
 */
export function shouldSendFlashDealAlert(
  hoursRemaining: number,
  previousHoursRemaining?: number,
): boolean {
  const previous = previousHoursRemaining ?? hoursRemaining + CRON_INTERVAL_HOURS;

  const crossed24HourThreshold = previous >= 24 && hoursRemaining < 24;
  const crossed2HourThreshold = previous >= 2 && hoursRemaining < 2;

  return crossed24HourThreshold || crossed2HourThreshold;
}