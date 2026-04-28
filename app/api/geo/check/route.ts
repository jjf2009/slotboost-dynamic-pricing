import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { origin, destination, departureTime } = await req.json();

  try {
    // Use Google Maps Distance Matrix API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // No API key — fallback to always allowed
      return NextResponse.json({ allowed: true, fallback: true });
    }

    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode: "driving",
      key: apiKey,
    });

    if (departureTime) {
      params.set(
        "departure_time",
        String(Math.floor(new Date(departureTime).getTime() / 1000))
      );
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );
    const data = await response.json();

    const element = data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      // Fallback: allow booking if API can't determine distance
      return NextResponse.json({ allowed: true, fallback: true });
    }

    const durationMinutes = element.duration_in_traffic
      ? element.duration_in_traffic.value / 60
      : element.duration.value / 60;

    const THRESHOLD_MINUTES = 30;
    const allowed = durationMinutes <= THRESHOLD_MINUTES;

    return NextResponse.json({
      allowed,
      durationMinutes: Math.round(durationMinutes),
      distanceKm: Math.round(element.distance.value / 1000),
    });
  } catch (err) {
    // Always fallback to allowed on error — don't block revenue
    console.error("Geo check failed:", err);
    return NextResponse.json({ allowed: true, fallback: true });
  }
}
