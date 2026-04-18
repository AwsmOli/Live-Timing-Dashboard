<template lang="pug">
.h-screen.flex.flex-col.bg-surface-0.text-gray-100.font-sans
  RaceHeader(:connectionStatus="connectionStatus")
  //- Tab bar
  .flex.items-center.gap-1.px-4.py-1.border-b.border-gray-800.bg-surface-0
    button.text-xs.font-medium.rounded.px-3.py-1.transition-colors.flex.items-center.gap-1(
      :class="activeTab === 'leaderboard' ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'"
      @click="activeTab = 'leaderboard'"
    )
      ListOrdered(:size="14")
      span Leaderboard
    button.text-xs.font-medium.rounded.px-3.py-1.transition-colors.flex.items-center.gap-1(
      :class="activeTab === 'lapchart' ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'"
      @click="activeTab = 'lapchart'"
    )
      ChartLine(:size="14")
      span Lap Chart
    .flex-1
    button.text-xs.font-medium.rounded.px-3.py-1.transition-colors.flex.items-center.gap-1(
      v-if="isMock || (nlsConfig && nlsConfig.streams.length > 0)"
      :class="showStream ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'"
      @click="showStream = !showStream"
    )
      MonitorPlay(:size="14")
      span.hidden(class="sm:inline") Watch Stream
    button.text-xs.font-medium.rounded.px-3.py-1.transition-colors.flex.items-center.gap-1(
      :class="showTicker ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'"
      @click="showTicker = !showTicker"
    )
      Newspaper(:size="14")
      span.hidden(class="sm:inline") Live Ticker
  ClassFilter(v-if="!showStream || activeTab !== 'leaderboard'")

  //- Lap chart (no stream overlay)
  .flex-1.overflow-hidden(v-if="activeTab === 'lapchart'")
    LapChart

  //- Leaderboard + optional stream + optional ticker
  template(v-else)
    .flex-1.flex.min-h-0(class="flex-col lg:flex-row")
      //- Stream panel
      .border-b.border-gray-800(
        v-if="showStream"
        class="h-[50vh] lg:h-auto lg:flex-1 lg:border-b-0 lg:border-r"
      )
        LiveStream

      //- Right column: leaderboard + ticker stacked when stream is active
      .flex.min-h-0(
        v-if="showStream && showTicker"
        class="flex-col lg:w-96 lg:flex-none"
      )
        .flex-1.overflow-y-auto.min-h-0
          ClassFilter
          LeaderboardTable(:compact="true")
        .border-t.border-gray-800(class="h-[40vh] lg:h-[40%] lg:flex-none")
          EventLog

      //- Leaderboard only (stream on, no ticker)
      .flex-1.overflow-y-auto.min-h-0(
        v-else-if="showStream"
        class="lg:w-96 lg:flex-none"
      )
        ClassFilter
        LeaderboardTable(:compact="true")

      //- No stream: leaderboard fills, optional ticker side panel
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
import { ListOrdered, ChartLine, MonitorPlay, Newspaper } from 'lucide-vue-next';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import RaceHeader from './components/RaceHeader.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ClassFilter from './components/ClassFilter.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LeaderboardTable from './components/LeaderboardTable.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverDetail from './components/DriverDetail.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LapChart from './components/LapChart.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LiveStream from './components/LiveStream.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import EventLog from './components/EventLog.vue';
import { startTickerPolling, stopTickerPolling } from './composables/useEventLog';

const activeTab = ref<'leaderboard' | 'lapchart'>(
  (localStorage.getItem('nls-activeTab') as 'leaderboard' | 'lapchart') || 'leaderboard'
);
const showStream = ref(localStorage.getItem('nls-showStream') === 'true');
const showTicker = ref(localStorage.getItem('nls-showTicker') === 'true');

watch(activeTab, (v) => localStorage.setItem('nls-activeTab', v));
watch(showStream, (v) => localStorage.setItem('nls-showStream', String(v)));
watch(showTicker, (v) => localStorage.setItem('nls-showTicker', String(v)));

const { processRaceData, drivers } = useRaceState();
const { config: nlsConfig } = useNlsConfig();
const connectionStatus = ref('disconnected');

// Determine if we should use mock mode
const isMock = new URLSearchParams(window.location.search).has('mock') ||
  import.meta.env.VITE_MOCK === 'true';

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
