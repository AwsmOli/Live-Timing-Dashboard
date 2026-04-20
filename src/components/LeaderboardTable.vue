<template lang="pug">
.flex-1.min-h-0(ref="containerRef")
  TransitionGroup(
    v-if="showCardLayout"
    tag="div"
    name="driver-list"
    :class="cardListClass"
  )
    DriverCard(
      v-for="(driver, idx) in filteredDrivers"
      :key="driver.STNR"
      :driver="driver"
      :index="idx"
      :isTracked="driver.STNR === trackedDriver"
      :trackedDriver="trackedDriverData"
      :predictedPosition="predictedPositions.get(driver.STNR) ?? null"
      :opaPosition="opaPositions.get(driver.STNR) ?? null"
      @select="selectedDriver = $event"
      @track="toggleTrack($event)"
    )

  .overflow-x-auto.h-full(v-else)
    table.w-full.border-collapse
      thead
        tr.bg-surface-2.border-b.border-gray-700.sticky.top-0.z-10
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-6.px-1
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-2 Pos
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-1(title="Position change") +/-
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-14.px-2 #
          th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2 Driver
          th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2 Team
          th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2 Car
          th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2 Class
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-2(title="Class position") CP
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-12.px-2 Laps
          th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-24.px-2 Gap
          th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-20.px-2(title="Interval to previous car") Int
          th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-18.px-1(
            v-for="s in sectorNumbers"
            :key="s"
          ) S{{ s }}
          th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-20.px-2 Last
          th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-20.px-2 Best
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-2 Pit
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-14.px-2(title="Predicted finish position based on current gap + pace over remaining laps") Pred
          th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-14.px-2(title="On Pace Alone") OPA
      TransitionGroup(
        tag="tbody"
        name="driver-list"
      )
        DriverRow(
          v-for="(driver, idx) in filteredDrivers"
          :key="driver.STNR"
          :driver="driver"
          :index="idx"
          :isTracked="driver.STNR === trackedDriver"
          :trackedDriver="trackedDriverData"
          :predictedPosition="predictedPositions.get(driver.STNR) ?? null"
          :opaPosition="opaPositions.get(driver.STNR) ?? null"
          @select="selectedDriver = $event"
          @track="toggleTrack($event)"
        )
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useLapHistory } from '../composables/useLapHistory';
import { useRaceState } from '../composables/useRaceState';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverCard from './DriverCard.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverRow from './DriverRow.vue';

const props = withDefaults(defineProps<{ compact?: boolean; }>(), { compact: false });
const TABLE_MIN_WIDTH = 1600;

const { filteredDrivers, sortedDrivers, selectedDriver, trackedDriver, getDriver, raceInfo } = useRaceState();
const { getLapHistory } = useLapHistory();
const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);

let resizeObserver: ResizeObserver | null = null;

const showCardLayout = computed(() => props.compact || containerWidth.value < TABLE_MIN_WIDTH);
const sectorNumbers = computed(() => Array.from({ length: Math.max(1, raceInfo.sectorCount || 5) }, (_, index) => index + 1));
const cardListClass = computed(() => {
  if (containerWidth.value >= 1180) {
    return 'grid grid-cols-2 gap-3 p-3';
  }
  return 'grid gap-2 p-2';
});

function updateContainerWidth() {
  containerWidth.value = containerRef.value?.clientWidth ?? window.innerWidth;
}

onMounted(() => {
  updateContainerWidth();
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    containerWidth.value = entry.contentRect.width;
  });

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

function parseLapTime(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return null;
    return mins * 60 + secs;
  }
  const val = parseFloat(timeStr);
  return isNaN(val) ? null : val;
}

function getMedianPace(stnr: string, fastestLap: string): number | null {
  const laps = getLapHistory(stnr);
  const cleanLaps = laps
    .filter((l) => !l.isPitIn)
    .map((l) => parseLapTime(l.lapTime))
    .filter((t): t is number => t !== null && t > 0);

  if (cleanLaps.length >= 2) {
    cleanLaps.sort((a, b) => a - b);
    const mid = Math.floor(cleanLaps.length / 2);
    return cleanLaps.length % 2 === 0
      ? (cleanLaps[mid - 1] + cleanLaps[mid]) / 2
      : cleanLaps[mid];
  }
  if (cleanLaps.length === 1) return cleanLaps[0];
  return parseLapTime(fastestLap);
}

function parseGapToSeconds(gap: string, leaderPace: number | null): number | null {
  if (!gap) return null;
  if (gap.startsWith('----LAP')) return 0;
  return parseLapTime(gap);
}

const NLS_RACE_DURATION_SECONDS = 4 * 60 * 60;

const predictedPositions = computed(() => {
  const sorted = sortedDrivers.value;
  if (sorted.length === 0) return new Map<string, number>();

  const leader = sorted[0];
  const leaderPace = getMedianPace(leader.STNR, leader.FASTESTLAP);
  const leaderLaps = Number(leader.LAPS) || 0;

  let remainingLaps = 5;
  if (leaderPace && leaderLaps > 0) {
    const elapsedTime = leaderLaps * leaderPace;
    const remainingTime = Math.max(0, NLS_RACE_DURATION_SECONDS - elapsedTime);
    remainingLaps = Math.max(1, Math.round(remainingTime / leaderPace));
  }

  const projections: { stnr: string; projectedGap: number; }[] = [];

  for (const driver of sorted) {
    const pace = getMedianPace(driver.STNR, driver.FASTESTLAP);
    if (!pace) continue;

    const driverLaps = Number(driver.LAPS) || 0;
    const lapDiff = leaderLaps - driverLaps;

    let currentGap: number;
    if (driver.STNR === leader.STNR) {
      currentGap = 0;
    } else if (lapDiff > 0 && leaderPace) {
      const timeGap = parseGapToSeconds(driver.GAP, leaderPace);
      currentGap = lapDiff * leaderPace + (timeGap ?? 0);
    } else {
      currentGap = parseGapToSeconds(driver.GAP, leaderPace) ?? 0;
    }

    const paceDelta = leaderPace ? (pace - leaderPace) : 0;
    const projectedGap = currentGap + paceDelta * remainingLaps;

    projections.push({ stnr: driver.STNR, projectedGap });
  }

  projections.sort((a, b) => a.projectedGap - b.projectedGap);

  const result = new Map<string, number>();
  projections.forEach((entry, idx) => {
    result.set(entry.stnr, idx + 1);
  });
  return result;
});

const opaPositions = computed(() => {
  const paceMap: { stnr: string; avgPace: number; }[] = [];

  for (const driver of sortedDrivers.value) {
    const laps = getLapHistory(driver.STNR);
    const cleanLaps = laps
      .filter((l) => !l.isPitIn)
      .map((l) => parseLapTime(l.lapTime))
      .filter((t): t is number => t !== null && t > 0);

    let avgPace: number | null = null;
    if (cleanLaps.length >= 1) {
      const sum = cleanLaps.reduce((a, b) => a + b, 0);
      avgPace = sum / cleanLaps.length;
    } else {
      avgPace = parseLapTime(driver.FASTESTLAP);
    }

    if (avgPace !== null) {
      paceMap.push({ stnr: driver.STNR, avgPace });
    }
  }

  paceMap.sort((a, b) => a.avgPace - b.avgPace);

  const result = new Map<string, number>();
  paceMap.forEach((entry, idx) => {
    result.set(entry.stnr, idx + 1);
  });
  return result;
});

const trackedDriverData = computed(() => {
  if (!trackedDriver.value) return null;
  return getDriver(trackedDriver.value) ?? null;
});

function toggleTrack(stnr: string) {
  trackedDriver.value = trackedDriver.value === stnr ? null : stnr;
}
</script>