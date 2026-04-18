import { readonly, ref } from "vue";

const NLS_ORIGIN = "https://www.nuerburgring-langstrecken-serie.de/language/en/live/";
// In dev, use Vite proxy to avoid CORS; in production, use corsproxy.io
const NLS_LIVE_URL = import.meta.env.DEV
  ? "/api/nls-live"
  : `https://corsproxy.io/?url=${encodeURIComponent(NLS_ORIGIN)}`;

export interface StreamInfo {
  label: string; // "Livestream" or "#3", "#44" etc.
  carNumber: string | null; // null for main stream
  videoId: string;
}

export interface NlsConfig {
  eventId: string;
  streams: StreamInfo[];
}

const config = ref<NlsConfig | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

function parseEventId(html: string): string | null {
  // Look for livetiming.azurewebsites.net/events/{id}
  const match = html.match(/livetiming\.azurewebsites\.net\/events\/(\d+)/);
  return match ? match[1] : null;
}

function parseStreams(html: string): StreamInfo[] {
  const streams: StreamInfo[] = [];

  // Match tab title + panel content pairs
  // Tab titles: <span class="vc_tta-title-text">Livestream</span> or <span class="vc_tta-title-text">#3</span>
  const tabRegex = /<span class="vc_tta-title-text">([^<]+)<\/span>/g;
  const iframeRegex = /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g;

  const tabLabels: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tabRegex.exec(html)) !== null) {
    tabLabels.push(m[1]);
  }

  const videoIds: string[] = [];
  while ((m = iframeRegex.exec(html)) !== null) {
    videoIds.push(m[1]);
  }

  // Match them up — tabs and iframes appear in same order in the HTML
  const count = Math.min(tabLabels.length, videoIds.length);
  for (let i = 0; i < count; i++) {
    const label = tabLabels[i];
    const carMatch = label.match(/^#(\d+)$/);
    streams.push({
      label,
      carNumber: carMatch ? carMatch[1] : null,
      videoId: videoIds[i],
    });
  }

  return streams;
}

export async function fetchNlsConfig(): Promise<NlsConfig | null> {
  if (config.value) return config.value;
  if (loading.value) return null;

  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(NLS_LIVE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const eventId = parseEventId(html);
    const streams = parseStreams(html);

    if (!eventId) {
      throw new Error("Could not find EVENT_ID in NLS page");
    }

    config.value = { eventId, streams };
    return config.value;
  } catch (e) {
    error.value = (e as Error).message;
    console.warn("Failed to fetch NLS config:", e);
    return null;
  } finally {
    loading.value = false;
  }
}

export function useNlsConfig() {
  return {
    config: readonly(config),
    loading: readonly(loading),
    error: readonly(error),
    fetchNlsConfig,
  };
}
