// Cloudflare Pages Function — /api/weather
// Proxies Open-Meteo weather API. No external dependencies needed.

export async function onRequestGet() {
  const LAT = 51.5115;
  const LON = -0.116;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/London&forecast_days=5`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=900, stale-while-revalidate",
      },
    });
  } catch (err) {
    console.error("Weather Proxy Error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch weather" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
