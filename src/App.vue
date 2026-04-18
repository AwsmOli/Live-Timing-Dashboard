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
  ClassFilter(v-if="!showStream || activeTab !== 'leaderboard'")

  //- Lap chart (no stream overlay)
  .flex-1.overflow-hidden(v-if="activeTab === 'lapchart'")
    LapChart

  //- Leaderboard + optional stream
  template(v-else)
    //- Stream active: side-by-side on lg+, stacked on mobile
    .flex-1.flex.min-h-0(v-if="showStream" class="flex-col lg:flex-row")
      //- Stream panel
      .border-b.border-gray-800(class="h-[50vh] lg:h-auto lg:flex-1 lg:border-b-0 lg:border-r")
        LiveStream
      //- Leaderboard panel (mobile layout forced)
      .flex-1.overflow-y-auto.min-h-0(class="lg:w-96 lg:flex-none")
        ClassFilter
        LeaderboardTable(:compact="true")

    //- No stream: normal leaderboard
    .flex-1.overflow-y-auto(v-else)
      LeaderboardTable

  DriverDetail
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { processLapHistoryUpdate } from './composables/useLapHistory';
import { useMockData } from './composables/useMockData';
import { useRaceState } from './composables/useRaceState';
import { useWebSocket, setEventId } from './composables/useWebSocket';
import { fetchNlsConfig, useNlsConfig } from './composables/useNlsConfig';
import type { RaceData } from './models';
import { ListOrdered, ChartLine, MonitorPlay } from 'lucide-vue-next';
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

const activeTab = ref<'leaderboard' | 'lapchart'>('leaderboard');
const showStream = ref(false);

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

  dataSource.connect();
  watchEffect(() => {
    connectionStatus.value = dataSource.connectionStatus.value;
  });
  onUnmounted(() => {
    dataSource.destroy();
  });
});
</script>
