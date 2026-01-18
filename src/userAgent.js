const { mkdir, readFile, writeFile } = require("node:fs/promises");
const { dirname, join } = require("path");
const { app } = require("electron");

const FEED_URL = "https://jnrbsn.github.io/user-agents/user-agents.json";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function chromeMajor(ua) {
  const m = ua.match(/Chrome\/(\d+)\./);
  return m ? Number(m[1]) : -1;
}

function isLinuxChrome(ua) {
  return (
    ua.includes("X11; Linux x86_64") &&
    ua.includes("Chrome/") &&
    !ua.includes("Edg/")
  );
}

async function readCache(cacheFile) {
  try {
    const raw = await readFile(cacheFile, "utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j.ua !== "string" || typeof j.ts !== "number") return null;
    if (Date.now() - j.ts > CACHE_TTL_MS) return null;
    return j.ua;
  } catch {
    return null;
  }
}

async function writeCache(cacheFile, ua) {
  const dir = dirname(cacheFile);
  await mkdir(dir, { recursive: true });
  await writeFile(
    cacheFile,
    JSON.stringify({ ts: Date.now(), ua }, null, 2),
    "utf8",
  );
}

function fallbackUA() {
  console.log("picked fallback ua");
  // uses Electron’s embedded Chromium version to avoid “ancient Chrome” screens if the feed fails.
  return (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
    `Chrome/${process.versions.chrome} Safari/537.36`
  );
}

async function fetchLatestLinuxChromeUA() {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": fallbackUA() },
  });
  if (!res.ok) throw new Error(`UA feed HTTP ${res.status}`);
  const list = await res.json();

  if (!Array.isArray(list)) throw new Error("UA feed: not an array");

  const candidates = list.filter(
    (ua) => typeof ua === "string" && isLinuxChrome(ua),
  );
  if (!candidates.length) throw new Error("UA feed: no Linux Chrome UA found");

  candidates.sort((a, b) => chromeMajor(b) - chromeMajor(a));
  const picked = candidates[0];

  // sanity: reject garbage
  if (chromeMajor(picked) < 100)
    throw new Error(`UA feed: suspicious UA ${picked}`);
  return picked;
}

async function getUserAgent() {
  const cacheFile = join(app.getPath("userData"), "ua-cache.json");
  const cached = await readCache(cacheFile);
  if (cached) return cached;

  try {
    const ua = await fetchLatestLinuxChromeUA();
    await writeCache(cacheFile, ua);
    return ua;
  } catch (err) {
    console.error(err);
    // keep app usable if feed breaks
    return fallbackUA();
  }
}

module.exports = { getUserAgent };
