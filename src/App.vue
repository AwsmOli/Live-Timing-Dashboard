<template lang="pug">
.h-screen.flex.flex-col.bg-surface-0.text-gray-100.font-sans
  RaceHeader(
    :connectionStatus="connectionStatus"
    :activeMedia="activeMedia"
    :showTicker="showTicker"
    :showStreamControl="showStreamControl"
    @toggle-media="toggleMedia"
    @toggle-ticker="showTicker = !showTicker"
  )
  ClassFilter(v-if="!hasMediaPanel")

  .flex-1.flex.min-h-0(class="flex-col lg:flex-row")
    .border-b.border-gray-800(
      v-if="hasMediaPanel"
      class="h-[50vh] lg:h-auto lg:flex-1 lg:border-b-0 lg:border-r"
    )
      LiveStream(v-if="activeMedia === 'stream'")
      GpsStream(v-else-if="activeMedia === 'gps'")

    .flex.min-h-0(
      v-if="hasMediaPanel && showTicker"
      class="flex-col lg:w-96 lg:flex-none"
    )
      .flex-1.overflow-y-auto.min-h-0
        ClassFilter
        LeaderboardTable(:compact="true")
      .border-t.border-gray-800(class="h-[40vh] lg:h-[40%] lg:flex-none")
        EventLog

    .flex-1.overflow-y-auto.min-h-0(
      v-else-if="hasMediaPanel"
      class="lg:w-96 lg:flex-none"
    )
      ClassFilter
      LeaderboardTable(:compact="true")

    template(v-else)
      .flex-1.overflow-y-auto.min-h-0
        LeaderboardTable
      .border-t.border-gray-800(
        v-if="showTicker"
        class="h-[40vh] lg:h-auto lg:w-80 lg:flex-none lg:border-t-0 lg:border-l"
      )
        EventLog

  DriverDetail
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import { processLapHistoryUpdate } from './composables/useLapHistory';
import { useMockData } from './composables/useMockData';
import { useRaceState } from './composables/useRaceState';
import { useWebSocket, setEventId } from './composables/useWebSocket';
import { fetchNlsConfig, useNlsConfig } from './composables/useNlsConfig';
import type { RaceData } from './models';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import RaceHeader from './components/RaceHeader.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ClassFilter from './components/ClassFilter.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LeaderboardTable from './components/LeaderboardTable.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverDetail from './components/DriverDetail.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LiveStream from './components/LiveStream.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import GpsStream from './components/GpsStream.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import EventLog from './components/EventLog.vue';
import { startTickerPolling, stopTickerPolling } from './composables/useEventLog';

type MediaPanel = 'none' | 'stream' | 'gps';

function getInitialMediaPanel(): MediaPanel {
  const stored = localStorage.getItem('nls-activeMedia');
  if (stored === 'stream' || stored === 'gps' || stored === 'none') {
    return stored;
  }

  return localStorage.getItem('nls-showStream') === 'true' ? 'stream' : 'none';
}

const activeMedia = ref<MediaPanel>(getInitialMediaPanel());
const showTicker = ref(localStorage.getItem('nls-showTicker') === 'true');
const hasMediaPanel = ref(activeMedia.value !== 'none');
const showStreamControl = ref(false);

watch(activeMedia, (v) => {
  hasMediaPanel.value = v !== 'none';
  localStorage.setItem('nls-activeMedia', v);
  localStorage.setItem('nls-showStream', String(v === 'stream'));
});
watch(showTicker, (v) => localStorage.setItem('nls-showTicker', String(v)));

function toggleMedia(mode: Exclude<MediaPanel, 'none'>) {
  activeMedia.value = activeMedia.value === mode ? 'none' : mode;
}

const { processRaceData, drivers } = useRaceState();
const { config: nlsConfig } = useNlsConfig();
const connectionStatus = ref('disconnected');

// Determine if we should use mock mode
const isMock = new URLSearchParams(window.location.search).has('mock') ||
  import.meta.env.VITE_MOCK === 'true';

watch([() => nlsConfig.value, () => isMock], ([config]) => {
  showStreamControl.value = isMock || Boolean(config && config.streams.length > 0);
}, { immediate: true });

function handleMessage(data: RaceData) {
  // Process lap history diff BEFORE updating race state
  if (data.RESULT) {
    processLapHistoryUpdate(data.RESULT, drivers);
  }
  processRaceData(data);
}

const dataSource = isMock
  ? useMockData(handleMessage)
  : useWebSocket(handleMessage);

// Mirror the data source's connection status
onMounted(async () => {
  // Fetch NLS config to get event ID and streams
  if (!isMock) {
    const cfg = await fetchNlsConfig();
    if (cfg) {
      setEventId(cfg.eventId);
      console.log(`NLS config loaded: eventId=${cfg.eventId}, ${cfg.streams.length} streams`);
    }
  }

  // Start live ticker polling
  startTickerPolling();

  dataSource.connect();
  watchEffect(() => {
    connectionStatus.value = dataSource.connectionStatus.value;
  });
  onUnmounted(() => {
    stopTickerPolling();
    dataSource.destroy();
  });
});
</script>
