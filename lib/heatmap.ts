const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function normalizeKey(key: string) {
  const legacyMatch = key.match(/^([a-zA-Z]{3})[-_ ]?(\d{1,2})$/);
  if (!legacyMatch) return null;

  const day = legacyMatch[1].slice(0, 3).toLowerCase();
  const hour = Number.parseInt(legacyMatch[2], 10);

  if (
    !DAY_KEYS.includes(day as (typeof DAY_KEYS)[number]) ||
    Number.isNaN(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    return null;
  }

  return `${day}_${String(hour).padStart(2, "0")}`;
}

export function getHeatMapKey(startTime: Date) {
  const dayIndex = (startTime.getDay() + 6) % 7;
  const hour = startTime.getHours();
  return `${DAY_KEYS[dayIndex]}_${String(hour).padStart(2, "0")}`;
}

export function normalizeHeatMap(heatMap: unknown): Record<string, number> {
  if (!heatMap || typeof heatMap !== "object" || Array.isArray(heatMap))
    return {};

  return Object.entries(heatMap).reduce<Record<string, number>>(
    (accumulator, [key, value]) => {
      const normalizedKey = normalizeKey(key) ?? key;
      if (typeof value === "number") {
        accumulator[normalizedKey] = value;
      }
      return accumulator;
    },
    {},
  );
}

export function getDemandIndexFromHeatMap(
  heatMap: unknown,
  startTime: Date,
  fallback = 0.5,
) {
  const normalizedHeatMap = normalizeHeatMap(heatMap);
  const key = getHeatMapKey(startTime);
  return normalizedHeatMap[key] ?? fallback;
}
