import { NextRequest, NextResponse } from "next/server";

// FR-28/29/30: Free geocoding and routing using OpenStreetMap (Nominatim) and OSRM.

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "SlotBoost-College-Project/1.0"
        }
      }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (err) {
    console.error(`Nominatim geocoding failed for "${address}":`, err);
    return null;
  }
}

async function getDrivingRoute(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number }
): Promise<{ durationMinutes: number; distanceKm: number } | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`
    );
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        durationMinutes: route.duration / 60,
        distanceKm: route.distance / 1000
      };
    }
    return null;
  } catch (err) {
    console.error("OSRM routing failed:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { origin, destination } = await req.json();

  if (!origin || !destination) {
    return NextResponse.json({ allowed: true, fallback: true, reason: "Missing origin or destination" });
  }

  try {
    // 1. Geocode origin
    const originCoords = await geocode(origin);
    if (!originCoords) {
      return NextResponse.json({ allowed: true, fallback: true, reason: "Failed to geocode origin" });
    }

    // 2. Geocode destination
    const destCoords = await geocode(destination);
    if (!destCoords) {
      return NextResponse.json({ allowed: true, fallback: true, reason: "Failed to geocode destination" });
    }

    // 3. Get routing route info
    const route = await getDrivingRoute(originCoords, destCoords);
    if (!route) {
      return NextResponse.json({ allowed: true, fallback: true, reason: "Failed to calculate route" });
    }

    const THRESHOLD_MINUTES = 30;
    const allowed = route.durationMinutes <= THRESHOLD_MINUTES;

    return NextResponse.json({
      allowed,
      durationMinutes: Math.round(route.durationMinutes),
      distanceKm: Math.round(route.distanceKm),
    });
  } catch (err) {
    console.error("Free geo check failed:", err);
    // FR-30: Fallback to allowed on error — don't block bookings
    return NextResponse.json({ allowed: true, fallback: true });
  }
}
