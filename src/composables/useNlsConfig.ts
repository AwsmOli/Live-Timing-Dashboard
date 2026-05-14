import { readonly, ref } from "vue";

const NLS_EN =
  "https://www.nuerburgring-langstrecken-serie.de/language/en/live/";
const NLS_DE =
  "https://www.nuerburgring-langstrecken-serie.de/language/de/live/";
const YT_AUTOADDICTION =
  "https://www.youtube.com/@AutoAddictionMedia/streams?gl=US&hl=en";

function nlsUrl(lang: "en" | "de"): string {
  const origin = lang === "en" ? NLS_EN : NLS_DE;
  return import.meta.env.DEV
    ? `/api/nls-live-${lang}`
    : `https://corsproxy.io/?url=${encodeURIComponent(origin)}`;
}

function ytAutoAddictionUrl(): string {
  return import.meta.env.DEV
    ? "/api/yt-autoaddiction"
    : `https://corsproxy.io/?url=${encodeURIComponent(YT_AUTOADDICTION)}`;
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

function parseLiveStreams(html: string): StreamInfo[] {
  const streams: StreamInfo[] = [];
  const seen = new Set<string>();

  // Collect all videoId positions in the page
  const videoIdRe = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  const positions: Array<{ id: string; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = videoIdRe.exec(html)) !== null) {
    positions.push({ id: m[1], start: m.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const { id, start } = positions[i];
    if (seen.has(id)) continue;

    // Scope the search to just this renderer (up to the next videoId)
    const end =
      i + 1 < positions.length ? positions[i + 1].start : start + 8000;
    const chunk = html.slice(start, Math.min(end, start + 8000));

    // Only include currently-live items (LIVE badge style)
    if (!chunk.includes('"badgeStyle":"THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE"'))
      continue;

    seen.add(id);

    // Extract title from "runs":[{"text":"..."}] within this chunk
    const titleM = chunk.match(/"runs":\[{"text":"([^"]+)"/);
    let label: string;
    if (titleM) {
      // e.g. "🔴 LIVE: Nürburgring 24h Q1 | 🇬🇧 | ADAC RAVENOL 24H NÜRBURGRING 2026"
      const raw = titleM[1].replace(/^🔴\s*LIVE:\s*/i, "");
      const session = raw.split(" | ")[0].trim(); // "Nürburgring 24h Q1"
      const short = session.replace(/^N[üu]rburgring\s+24h?\s+/i, "").trim();
      label = `AutoAddiction ${short || streams.length + 1}`;
    } else {
      label = `AutoAddiction ${streams.length + 1}`;
    }

    streams.push({ label, carNumber: null, videoId: id });
  }

  return streams;
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

    // Fetch AutoAddiction live streams in parallel with NLS page fetching
    const ytHtml = await fetchPage(ytAutoAddictionUrl());
    const aaStreams = ytHtml ? parseLiveStreams(ytHtml) : [];

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
        // Insert AutoAddiction streams after main streams, before onboards
        for (const s of aaStreams) {
          if (!seenVideoIds.has(s.videoId)) {
            seenVideoIds.add(s.videoId);
            merged.push(s);
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
