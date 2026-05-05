// Cloudflare Pages Function — /api/data
// Replaces Vercel serverless function. Uses direct Upstash Redis REST API.

const DEFAULTS = {
  slides: [
    {
      url: "assets/carousel_default_1.png",
      caption:
        "Welcome to the Wheatstone Makerspace — Build • Create • Innovate",
    },
    {
      url: "assets/carousel_default_2.png",
      caption:
        "Open to all KCL students — Mon-Fri • Macadam Building • Strand Campus",
    },
    {
      url: "assets/carousel_default_3.png",
      caption:
        "3D Printing • Laser Cutting • CNC — Equipment available for your projects",
    },
  ],
  statusUpdates: [
    "Welcome to the Wheatstone Makerspace — Macadam Building, Strand Campus",
    "Remember: No food or drink allowed in the lab!",
    "Need help? Ask a Wheatstone Alliance committee member",
  ],
  events: [
    {
      name: "Intro to Soldering Workshop",
      date: "2026-05-08",
      time: "14:00 – 16:00",
      caption: "Learn the basics of soldering components",
      link: "https://kclsu.org",
    },
    {
      name: "Robotics Society Build Night",
      date: "2026-05-10",
      time: "18:00 – 21:00",
    },
    {
      name: "KCL Rocketry — Launch Prep",
      date: "2026-05-14",
      time: "15:00 – 18:00",
    },
    {
      name: "3D Printing Masterclass",
      date: "2026-05-17",
      time: "13:00 – 15:00",
    },
    {
      name: "Electronics Society Social",
      date: "2026-05-22",
      time: "19:00 – 22:00",
    },
  ],
  bbcEnabled: true,
  carouselInterval: 5000,
  statusInterval: 5000,
  credentials: {
    username: "admin",
    password: "password123",
  },
};

// --- Upstash Redis REST helpers ---

function getRedisCredentials(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return { url, token };
}

async function redisGet(env, key) {
  const { url, token } = getRedisCredentials(env);
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const json = await res.json();
  // Upstash returns { result: "<stringified JSON>" } for GET
  if (json.result === null || json.result === undefined) return null;

  try {
    return typeof json.result === "string"
      ? JSON.parse(json.result)
      : json.result;
  } catch {
    return json.result;
  }
}

async function redisSet(env, key, value) {
  const { url, token } = getRedisCredentials(env);
  if (!url || !token) throw new Error("Redis not configured");

  const res = await fetch(`${url}/set/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(JSON.stringify(value)),
  });

  if (!res.ok) {
    throw new Error(`Redis SET failed: ${res.status}`);
  }
}

// --- Shared headers ---

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// --- GET /api/data ---

export async function onRequestGet(context) {
  const { env } = context;
  const { url: kvUrl } = getRedisCredentials(env);

  // If Redis isn't configured, return defaults
  if (!kvUrl) {
    return new Response(JSON.stringify(DEFAULTS), {
      headers: NO_CACHE_HEADERS,
    });
  }

  try {
    let data = await redisGet(env, "wheatstone_data");
    if (!data) {
      // Initialize Redis if empty
      await redisSet(env, "wheatstone_data", DEFAULTS);
      data = DEFAULTS;
    }
    return new Response(JSON.stringify(data), {
      headers: NO_CACHE_HEADERS,
    });
  } catch (err) {
    console.error("KV Get Error:", err);
    return new Response(JSON.stringify(DEFAULTS), {
      headers: NO_CACHE_HEADERS,
    });
  }
}

// --- POST /api/data ---

export async function onRequestPost(context) {
  const { request, env } = context;
  const { url: kvUrl } = getRedisCredentials(env);

  if (!kvUrl) {
    return new Response(
      JSON.stringify({
        error:
          "Database is not configured. Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your Cloudflare Pages environment variables.",
      }),
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const payload = await request.json();
    if (!payload) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400,
        headers: NO_CACHE_HEADERS,
      });
    }

    await redisSet(env, "wheatstone_data", payload);

    return new Response(JSON.stringify({ success: true, data: payload }), {
      headers: NO_CACHE_HEADERS,
    });
  } catch (err) {
    console.error("KV Post Error:", err);
    return new Response(JSON.stringify({ error: "Failed to save data" }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
