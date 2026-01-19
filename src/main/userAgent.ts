import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'path';
import { CacheData } from '../types/common';

const FEED_URL = 'https://jnrbsn.github.io/user-agents/user-agents.json';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function chromeMajor(ua: string): number {
  const m = ua.match(/Chrome\/(\d+)\./);
  return m ? Number(m[1]) : -1;
}

function isLinuxChrome(ua: string): boolean {
  return (
    ua.includes('X11; Linux x86_64') &&
    ua.includes('Chrome/') &&
    !ua.includes('Edg/')
  );
}

async function readCache(cacheFile: string): Promise<string | null> {
  try {
    const raw: string = await readFile(cacheFile, 'utf8');
    const j: CacheData = JSON.parse(raw);
    if (!j || typeof j.ua !== 'string' || typeof j.ts !== 'number') return null;
    if (Date.now() - j.ts > CACHE_TTL_MS) return null;
    return j.ua;
  } catch {
    return null;
  }
}

async function writeCache(cacheFile: string, ua: string): Promise<void> {
  const dir: string = dirname(cacheFile);
  await mkdir(dir, { recursive: true });
  await writeFile(
    cacheFile,
    JSON.stringify({ ts: Date.now(), ua }, null, 2),
    'utf8'
  );
}

function fallbackUA(): string {
  console.log('picked fallback ua');
  return (
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    `Chrome/${process.versions.chrome} Safari/537.36`
  );
}

async function fetchLatestLinuxChromeUA(): Promise<string> {
  const res: Response = await fetch(FEED_URL, {
    headers: { 'User-Agent': fallbackUA() },
  });
  if (!res.ok) throw new Error(`UA feed HTTP ${res.status}`);
  const list: unknown = await res.json();

  if (!Array.isArray(list)) throw new Error('UA feed: not an array');

  const candidates: string[] = list.filter(
    (ua: unknown): ua is string => typeof ua === 'string' && isLinuxChrome(ua)
  );
  if (!candidates.length) throw new Error('UA feed: no Linux Chrome UA found');

  candidates.sort(
    (a: string, b: string): number => chromeMajor(b) - chromeMajor(a)
  );
  const picked: string = candidates[0];

  if (chromeMajor(picked) < 100)
    throw new Error(`UA feed: suspicious UA ${picked}`);
  return picked;
}

export async function getUserAgent(): Promise<string> {
  const cacheFile: string = join(app.getPath('userData'), 'ua-cache.json');
  const cached: string | null = await readCache(cacheFile);
  if (cached) return cached;

  try {
    const ua: string = await fetchLatestLinuxChromeUA();
    await writeCache(cacheFile, ua);
    return ua;
  } catch (err) {
    console.error(err);
    return fallbackUA();
  }
}
