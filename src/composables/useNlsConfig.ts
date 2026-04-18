import { readonly, ref } from "vue";

const NLS_EN =
  "https://www.nuerburgring-langstrecken-serie.de/language/en/live/";
const NLS_DE =
  "https://www.nuerburgring-langstrecken-serie.de/language/de/live/";

function nlsUrl(lang: "en" | "de"): string {
  const origin = lang === "en" ? NLS_EN : NLS_DE;
  return import.meta.env.DEV
    ? `/api/nls-live-${lang}`
    : `https://corsproxy.io/?url=${encodeURIComponent(origin)}`;
}

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

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchNlsConfig(): Promise<NlsConfig | null> {
  if (config.value) return config.value;
  if (loading.value) return null;

  loading.value = true;
  error.value = null;

  try {
    // Fetch EN and DE pages in parallel
    const [enHtml, deHtml] = await Promise.all([
      fetchPage(nlsUrl("en")),
      fetchPage(nlsUrl("de")),
    ]);

    const html = enHtml || deHtml;
    if (!html) throw new Error("Failed to fetch NLS pages");

    const eventId = parseEventId(html);
    if (!eventId) throw new Error("Could not find EVENT_ID in NLS page");

    // Get EN streams, relabel main stream
    const enStreams = enHtml ? parseStreams(enHtml) : [];
    for (const s of enStreams) {
      if (!s.carNumber) s.label = "Mainstream EN";
    }

    // Get DE streams, relabel main stream
    const deStreams = deHtml ? parseStreams(deHtml) : [];
    for (const s of deStreams) {
      if (!s.carNumber) s.label = "Mainstream GER";
    }

    // Merge: insert DE main stream right after EN main stream, skip duplicates
    const seenVideoIds = new Set(enStreams.map((s) => s.videoId));
    const merged: StreamInfo[] = [];
    for (const s of enStreams) {
      merged.push(s);
      // Insert DE main stream right after EN main stream
      if (!s.carNumber) {
        for (const ds of deStreams) {
          if (!ds.carNumber && !seenVideoIds.has(ds.videoId)) {
            seenVideoIds.add(ds.videoId);
            merged.push(ds);
          }
        }
      }
    }
    // Add any remaining DE streams (onboards) not yet seen
    for (const ds of deStreams) {
      if (!seenVideoIds.has(ds.videoId)) {
        seenVideoIds.add(ds.videoId);
        merged.push(ds);
      }
    }

    config.value = { eventId, streams: merged };
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
