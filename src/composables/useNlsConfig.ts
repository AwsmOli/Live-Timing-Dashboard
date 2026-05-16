import { readonly, ref } from "vue";

export interface StreamInfo {
  label: string;
  carNumber: string | null; // null for main streams
  videoId: string;
}

export interface NlsConfig {
  eventId: string;
  streams: StreamInfo[];
}

const HARDCODED_STREAMS: StreamInfo[] = [
  { label: "Mainstream EN", carNumber: null, videoId: "ykB5jleVsAM" },
  { label: "Mainstream GER", carNumber: null, videoId: "oFBUkzV0vFs" },
  { label: "Pit Lane", carNumber: null, videoId: "OZdE2ZOAXfo" },
  { label: "#3", carNumber: "3", videoId: "Keqjx5zqeDE" },
  { label: "#632", carNumber: "632", videoId: "uuTNqqRaQCE" },
];

const config = ref<NlsConfig>({
  eventId: "50",
  streams: HARDCODED_STREAMS,
});

export function useNlsConfig() {
  return {
    config: readonly(config),
  };
}
