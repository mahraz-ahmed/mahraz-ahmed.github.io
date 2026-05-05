module.exports = async function handler(req, res) {
  // Use HTTPS on the backend, since the server has modern certificates
  const url = `https://api.tfl.gov.uk/Line/Mode/tube,elizabeth-line/Status`;

  try {
    const fetch = (await import("node-fetch")).default || globalThis.fetch;
    const response = await fetch(url);
    const data = await response.json();

    // Set caching headers so we don't hit the API limits
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json(data);
  } catch (err) {
    console.error("TfL Proxy Error:", err);
    return res.status(500).json({ error: "Failed to fetch TfL status" });
  }
};
