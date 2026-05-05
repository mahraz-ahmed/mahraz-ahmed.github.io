/* ========================================
   WHEATSTONE MAKERSPACE DASHBOARD
   Main Dashboard Logic
   ======================================== */

(function () {
  "use strict";

  // ---- Default Data ----
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
  };

  // ---- Weather code mapping ----
  const WEATHER_ICONS = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌦️",
    55: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    71: "🌨️",
    73: "🌨️",
    75: "🌨️",
    77: "🌨️",
    80: "🌦️",
    81: "🌧️",
    82: "🌧️",
    85: "🌨️",
    86: "🌨️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️",
  };

  const WEATHER_DESCS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Showers",
    82: "Heavy showers",
    85: "Light snow showers",
    86: "Snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm w/ hail",
    99: "Severe thunderstorm",
  };

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const MONTH_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // ---- State ----
  let currentSlide = 0;
  let carouselTimer = null;
  let slides = [];
  let carouselInterval = DEFAULTS.carouselInterval;
  let statusInterval = DEFAULTS.statusInterval;
  let currentStatus = 0;
  let statusTimer = null;

  let remoteData = null;

  async function loadData() {
    try {
      const res = await fetch("/api/data?t=" + new Date().getTime(), {
        cache: "no-store",
      });
      if (res.ok) {
        remoteData = await res.json();
      } else {
        remoteData = DEFAULTS;
      }
    } catch (e) {
      console.warn("Backend unavailable, using defaults");
      remoteData = DEFAULTS;
    }

    slides = remoteData.slides || DEFAULTS.slides;
    carouselInterval = remoteData.carouselInterval || DEFAULTS.carouselInterval;
    statusInterval = remoteData.statusInterval || DEFAULTS.statusInterval;
  }

  function getStatusUpdates() {
    return remoteData?.statusUpdates || DEFAULTS.statusUpdates;
  }
  function getEvents() {
    return remoteData?.events || DEFAULTS.events;
  }
  function isBBCEnabled() {
    return remoteData?.bbcEnabled !== undefined
      ? remoteData.bbcEnabled
      : DEFAULTS.bbcEnabled;
  }

  // ---- Clock ----
  function initClock() {
    const timeEl = document.getElementById("clock-time");
    const dateEl = document.getElementById("clock-date");

    function update() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      timeEl.textContent = `${hours}:${mins}`;

      const dayName = DAY_NAMES[now.getDay()];
      const day = now.getDate();
      const month = MONTH_NAMES[now.getMonth()];
      dateEl.textContent = `${dayName} ${day} ${month}`;
    }

    update();
    setInterval(update, 1000);
  }

  // ---- Weather ----
  async function initWeather() {
    const targetUrl =
      "https://api.open-meteo.com/v1/forecast?latitude=51.5113&longitude=-0.1160&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FLondon";

    // Older TVs often fail Let's Encrypt certificates but trust Cloudflare/DigiCert.
    // GitHub Pages enforces HTTPS, so we can't use HTTP without Mixed Content errors.
    // Instead, we use the same proxy fallbacks as the BBC news ticker.
    const urlsToTry = [
      "/api/weather",
      "https://api.codetabs.com/v1/proxy/?quest=" +
      encodeURIComponent(targetUrl),
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl),
      targetUrl,
    ];

    let data = null;

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          data = await res.json();
          if (data && data.current) break;
        }
      } catch (err) {
        console.warn("Weather proxy failed:", url, err);
      }
    }

    if (data && data.current) {
      try {
        const currentTemp = Math.round(data.current.temperature_2m);
        const currentCode = data.current.weather_code;

        document.getElementById("weather-icon").textContent =
          WEATHER_ICONS[currentCode] || "🌡️";
        document.getElementById("weather-temp").textContent =
          `${currentTemp}°C`;
        document.getElementById("weather-desc").textContent =
          WEATHER_DESCS[currentCode] || "";

        const forecastEl = document.getElementById("weather-forecast");
        forecastEl.innerHTML = "";

        for (let i = 1; i < Math.min(data.daily.time.length, 5); i++) {
          const date = new Date(data.daily.time[i]);
          const dayName = DAY_NAMES[date.getDay()];
          const code = data.daily.weather_code[i];
          const maxT = Math.round(data.daily.temperature_2m_max[i]);
          const minT = Math.round(data.daily.temperature_2m_min[i]);

          const dayEl = document.createElement("div");
          dayEl.className = "forecast-day";
          dayEl.innerHTML = `
            <span>${dayName}</span>
            <span class="forecast-icon">${WEATHER_ICONS[code] || "🌡️"}</span>
            <span class="forecast-temp">${maxT}°/${minT}°</span>
          `;
          forecastEl.appendChild(dayEl);
        }
      } catch (e) {
        console.warn("Weather render failed:", e);
      }
    } else {
      document.getElementById("weather-icon").textContent = "🌡️";
      document.getElementById("weather-temp").textContent = "--°C";
      document.getElementById("weather-desc").textContent = "Unavailable";
    }

    setTimeout(initWeather, 15 * 60 * 1000);
  }

  // ---- Carousel ----
  function initCarousel() {
    loadData();
    const container = document.getElementById("carousel-slides");
    const dotsContainer = document.getElementById("carousel-dots");

    if (!container) return;
    container.innerHTML = "";
    dotsContainer.innerHTML = "";

    if (slides.length === 0) {
      container.innerHTML =
        '<div class="carousel-slide active" style="display:flex;align-items:center;justify-content:center;"><p style="color:var(--text-muted);font-size:1.2rem;">No slides configured. Add slides from the admin panel.</p></div>';
      return;
    }

    slides.forEach((slide, i) => {
      const slideEl = document.createElement("div");
      slideEl.className = `carousel-slide ${i === 0 ? "active" : ""}`;
      slideEl.innerHTML = `
        <img src="${slide.url}" alt="Slide ${i + 1}" onerror="this.style.display='none'">
        ${slide.caption ? `<div class="carousel-caption">${slide.caption}</div>` : ""}
      `;
      container.appendChild(slideEl);

      const dot = document.createElement("div");
      dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
      dot.addEventListener("click", () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });

    currentSlide = 0;
    startCarouselTimer();
  }

  function goToSlide(index) {
    const allSlides = document.querySelectorAll(".carousel-slide");
    const allDots = document.querySelectorAll(".carousel-dot");

    allSlides.forEach((s) => s.classList.remove("active"));
    allDots.forEach((d) => d.classList.remove("active"));

    currentSlide = index;
    if (allSlides[currentSlide])
      allSlides[currentSlide].classList.add("active");
    if (allDots[currentSlide]) allDots[currentSlide].classList.add("active");

    resetCarouselTimer();
  }

  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }

  function startCarouselTimer() {
    if (carouselTimer) clearTimeout(carouselTimer);
    if (slides.length > 1) {
      carouselTimer = setTimeout(nextSlide, carouselInterval);
    }
  }

  function resetCarouselTimer() {
    startCarouselTimer();
  }

  // ---- Status Updates (side panel, cycling) ----
  function initStatusUpdates() {
    const messageEl = document.getElementById("status-message");
    const dotsEl = document.getElementById("status-dots");
    if (!messageEl || !dotsEl) return;

    const updates = getStatusUpdates();

    if (updates.length === 0) {
      messageEl.textContent = "No status updates";
      dotsEl.innerHTML = "";
      return;
    }

    // Build dots
    dotsEl.innerHTML = "";
    updates.forEach((_, i) => {
      const dot = document.createElement("div");
      dot.className = `status-dot ${i === 0 ? "active" : ""}`;
      dotsEl.appendChild(dot);
    });

    currentStatus = 0;
    messageEl.textContent = updates[0];

    // Clear existing timer
    if (statusTimer) clearInterval(statusTimer);

    if (updates.length > 1) {
      statusTimer = setInterval(() => {
        // Fade out
        messageEl.classList.add("fade-out");

        setTimeout(() => {
          currentStatus = (currentStatus + 1) % updates.length;
          messageEl.textContent = updates[currentStatus];
          messageEl.classList.remove("fade-out");

          // Update dots
          dotsEl.querySelectorAll(".status-dot").forEach((d, i) => {
            d.classList.toggle("active", i === currentStatus);
          });
        }, 500);
      }, statusInterval);
    }
  }

  // ---- Events (side panel) ----
  function initEvents() {
    const listEl = document.getElementById("events-list");
    if (!listEl) return;

    const events = getEvents();

    // Filter to future/today events and sort by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = events
      .filter((e) => {
        const d = new Date(e.date);
        return d >= today;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    listEl.innerHTML = "";

    if (upcoming.length === 0) {
      listEl.innerHTML = '<div class="event-empty">No upcoming events</div>';
      return;
    }

    upcoming.forEach((event) => {
      const d = new Date(event.date);
      const dayNum = d.getDate();
      const monthStr = MONTH_SHORT[d.getMonth()];

      const item = document.createElement("div");
      item.className = "event-item";
      let qrHtml = "";
      if (event.link) {
        try {
          const qr = new QRious({
            value: event.link,
            size: 100,
            background: "white",
            foreground: "black",
          });
          const qrUrl = qr.toDataURL();
          qrHtml = `
            <div class="event-qr">
              <img src="${qrUrl}" alt="QR Code">
            </div>
          `;
        } catch (err) {
          console.warn("QR Code generation failed:", err);
        }
      }

      const displayName =
        event.name.length > 46
          ? event.name.substring(0, 43) + "..."
          : event.name;

      item.innerHTML = `
        <div class="event-date-badge">
          <span class="event-month">${monthStr}</span>
          <span class="event-day">${dayNum}</span>
          ${event.time ? `<span class="event-badge-time">${event.time}</span>` : ""}
        </div>
        <div class="event-details">
          <div class="event-name">${displayName}</div>
          ${event.caption ? `<div class="event-caption">${event.caption}</div>` : ""}
        </div>
        ${qrHtml}
      `;
      listEl.appendChild(item);
    });
  }

  // ---- News Ticker ----
  async function initTicker() {
    const trackEl = document.getElementById("ticker-track");
    if (!trackEl) return;

    let headlines = [];

    // Fetch Tech News if enabled
    if (isBBCEnabled()) {
      const feedUrl = "https://www.engadget.com/rss.xml";
      const proxies = [
        "https://api.codetabs.com/v1/proxy/?quest=" +
        encodeURIComponent(feedUrl),
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(feedUrl),
        "https://corsproxy.io/?" + encodeURIComponent(feedUrl),
      ];

      let fetched = false;
      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl);
          if (!res.ok) continue;
          const text = await res.text();
          const isAtom = text.includes("<entry>") || text.includes("<entry ");
          if (!text.includes("<item>") && !text.includes("<item ") && !isAtom) continue;

          const parser = new DOMParser();
          const xml = parser.parseFromString(text, "text/xml");
          const items = isAtom ? xml.querySelectorAll("entry") : xml.querySelectorAll("item");
          let count = 0;

          function decodeHTMLEntities(str) {
            const txt = document.createElement("textarea");
            txt.innerHTML = str;
            return txt.value;
          }

          items.forEach((item) => {
            if (count >= 12) return;
            const title = item.querySelector("title");
            const desc = item.querySelector("description") || item.querySelector("summary") || item.querySelector("content");
            if (title && title.textContent) {
              let text = decodeHTMLEntities(title.textContent).trim();

              if (desc && desc.textContent) {
                // Strip HTML tags that might be inside CDATA blocks
                let descText = desc.textContent.replace(/<[^>]*>?/gm, '').trim();
                descText = decodeHTMLEntities(descText);
                // Avoid giant descriptions breaking the ticker
                if (descText.length > 100) descText = descText.substring(0, 100) + "...";

                if (descText && descText !== text) {
                  text += " — " + descText;
                }
              }
              headlines.push(text);
              count++;
            }
          });
          fetched = true;
          break;
        } catch (err) {
          console.warn("Proxy failed:", proxyUrl, err);
        }
      }

      if (!fetched) {
        headlines.push(
          "Tech News feed temporarily unavailable — check back shortly",
        );
      }
    } else {
      headlines.push("Tech News feed is disabled");
    }

    // Build ticker track (duplicate for seamless loop)
    trackEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let copy = 0; copy < 2; copy++) {
      headlines.forEach((h) => {
        const item = document.createElement("span");
        item.className = "ticker-item";
        item.textContent = h;
        fragment.appendChild(item);
      });
    }

    trackEl.appendChild(fragment);

    const totalItems = headlines.length;
    const duration = Math.max(60, totalItems * 12);
    trackEl.style.setProperty("--ticker-duration", `${duration}s`);

    setTimeout(initTicker, 5 * 60 * 1000);
  }

  // ---- Init ----
  document.addEventListener("DOMContentLoaded", async () => {
    await loadData();
    initClock();
    initWeather();
    initCarousel();
    initStatusUpdates();
    initEvents();
    initTicker();

    // The TV should reload entirely every 30 minutes to pick up code/data updates cleanly
    setInterval(() => location.reload(), 30 * 60 * 1000);

    // Live-sync polling every 60 seconds
    setInterval(async () => {
      const oldDataStr = JSON.stringify(remoteData);
      await loadData();
      const newDataStr = JSON.stringify(remoteData);

      if (oldDataStr !== newDataStr) {
        // Softly re-initialize components with the live data
        initCarousel();
        initStatusUpdates();
        initEvents();
      }
    }, 60 * 1000);
  });
})();
