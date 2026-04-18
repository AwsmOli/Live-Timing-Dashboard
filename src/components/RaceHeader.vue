<template lang="pug">
header.bg-surface-1.border-b.border-gray-800.px-4.py-3.flex.items-center.justify-between.flex-wrap.gap-2
  .flex.items-center.gap-3
    .text-xl.font-bold.text-white.tracking-tight NLS
    .hidden(class="sm:block")
      .text-sm.text-gray-400 {{ raceInfo.cup }}
      .text-xs.text-gray-500 {{ raceInfo.heat }} — {{ raceInfo.trackName }}
  .flex.items-center.gap-3.flex-wrap.justify-end
    //- Elapsed / Remaining time
    .text-xs.font-mono.text-gray-300.flex.items-center.gap-1(v-if="elapsedDisplay")
      Clock(:size="12" class="text-gray-500")
      span {{ elapsedDisplay }}
    .text-xs.font-mono.flex.items-center.gap-1(v-if="remainingDisplay" :class="remainingUrgent ? 'text-racing-red' : 'text-gray-300'")
      Hourglass(:size="12" class="text-gray-500")
      span {{ remainingDisplay }}
    //- Leader lap
    .text-xs.font-mono.text-gray-300.flex.items-center.gap-1(v-if="leaderLaps")
      RotateCw(:size="12" class="text-gray-500")
      span {{ leaderLaps }}
    //- Car count
    .text-xs.font-mono.text-gray-300.flex.items-center.gap-1(v-if="carCount > 0")
      CarIcon(:size="12" class="text-gray-500")
      span {{ carCount }}
    //- Connection status
    .flex.items-center(class="gap-1.5")
      Wifi(v-if="connectionStatusValue === 'connected'" :size="12" class="text-racing-green")
      RefreshCw(v-else-if="connectionStatusValue === 'reconnecting'" :size="12" class="text-yellow-400 animate-spin")
      WifiOff(v-else :size="12" class="text-racing-red")
      span.text-xs.text-gray-400 {{ statusLabel }}
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useLapHistory } from '../composables/useLapHistory';
import { useRaceState } from '../composables/useRaceState';
import type { ConnectionStatus } from '../models';
import { Clock, Hourglass, RotateCw, Car as CarIcon, Wifi, WifiOff, RefreshCw } from 'lucide-vue-next';

const RACE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

const props = defineProps<{
  connectionStatus?: ConnectionStatus;
}>();

const connectionStatusValue = computed(() => props.connectionStatus ?? 'disconnected');

const { raceInfo, sortedDrivers, drivers } = useRaceState();
const { getLapHistory } = useLapHistory();

// Tick every second to update elapsed/remaining
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval>;
onMounted(() => {
  ticker = setInterval(() => { now.value = Date.now(); }, 1000);
});
onUnmounted(() => { clearInterval(ticker); });

const leaderLaps = computed(() => {
  if (sortedDrivers.value.length === 0) return null;
  return sortedDrivers.value[0].LAPS;
});

const carCount = computed(() => drivers.size);

// Estimate elapsed time from leader's pace × laps
const elapsedMs = computed(() => {
  if (sortedDrivers.value.length === 0) return null;
  const leader = sortedDrivers.value[0];
  const laps = getLapHistory(leader.STNR);
  const cleanLaps = laps
    .filter((l) => !l.isPitIn)
    .map((l) => {
      const parts = l.lapTime.split(':');
      if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      const v = parseFloat(l.lapTime);
      return isNaN(v) ? null : v;
    })
    .filter((t): t is number => t !== null && t > 0);

  if (cleanLaps.length === 0) return null;

  const medianPace = (() => {
    const sorted = [...cleanLaps].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  })();

  // Use actual completed lap count from history, not LAPS field
  const totalLaps = laps.length;
  return totalLaps * medianPace * 1000;
});

const remainingMs = computed(() => {
  if (!elapsedMs.value) return null;
  return Math.max(0, RACE_DURATION_MS - elapsedMs.value);
});

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const elapsedDisplay = computed(() => {
  if (!elapsedMs.value) return null;
  return formatDuration(elapsedMs.value);
});

const remainingDisplay = computed(() => {
  if (remainingMs.value === null) return null;
  return formatDuration(remainingMs.value);
});

const remainingUrgent = computed(() => {
  if (remainingMs.value === null) return false;
  return remainingMs.value < 30 * 60 * 1000; // < 30 min
});

const statusDotClass = computed(() => ({
  'bg-racing-green': connectionStatusValue.value === 'connected',
  'bg-racing-yellow': connectionStatusValue.value === 'reconnecting',
  'bg-racing-red': connectionStatusValue.value === 'disconnected',
}));

const statusLabel = computed(() => {
  switch (connectionStatusValue.value) {
    case 'connected': return 'Live';
    case 'reconnecting': return 'Reconnecting...';
    default: return 'Disconnected';
  }
});
</script>
