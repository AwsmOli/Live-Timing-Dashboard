import { readonly, ref, onUnmounted } from "vue";

const TICKER_ORIGIN =
  "https://www.nuerburgring-langstrecken-serie.de/wp-content/themes/pofo-child/liveticker.php";
const TICKER_URL = import.meta.env.DEV
  ? "/api/nls-ticker"
  : `https://corsproxy.io/?url=${encodeURIComponent(TICKER_ORIGIN)}`;

const POLL_INTERVAL = 60_000; // 1 minute

export interface TickerEntry {
  time: string;
  message: string;
  isAlert: boolean; // red flag, safety car, etc.
}

const entries = ref<TickerEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

function parseTickerHtml(html: string): TickerEntry[] {
  const result: TickerEntry[] = [];
  // Each row: <tr><td style="...">TIME</td><td style="...">MESSAGE</td></tr>
  const rowRegex =
    /<tr>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gs;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(html)) !== null) {
    const rawTime = m[1]
      .replace(/&nbsp;/g, " ")
      .replace(/<[^>]*>/g, "")
      .trim();
    const rawMsg = m[2].replace(/<[^>]*>/g, "").trim();
    // Detect alert rows (red styled text)
    const isAlert =
      m[0].includes("cc0000") || m[0].includes("font-weight: bold");
    result.push({ time: rawTime, message: rawMsg, isAlert });
  }
  return result;
}

async function fetchTicker(): Promise<void> {
  loading.value = true;
  try {
    const res = await fetch(TICKER_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const parsed = parseTickerHtml(html);
    if (parsed.length > 0) {
      // Reverse so newest entries are first
      entries.value = parsed.reverse();
      error.value = null;
    }
  } catch (e) {
    error.value = (e as Error).message;
    console.warn("Failed to fetch live ticker:", e);
  } finally {
    loading.value = false;
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

export function startTickerPolling() {
  if (started) return;
  started = true;
  fetchTicker();
  pollTimer = setInterval(fetchTicker, POLL_INTERVAL);
}

export function stopTickerPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  started = false;
}

export function useEventLog() {
  return {
    entries: readonly(entries),
    loading: readonly(loading),
    error: readonly(error),
  };
}
