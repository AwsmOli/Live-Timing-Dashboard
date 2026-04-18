<template lang="pug">
//- Mobile card view (also used in compact/stream mode)
.flex-1(:class="compact ? '' : 'sm:hidden'")
  TransitionGroup(
    tag="div"
    name="driver-list"
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

//- Desktop table view (hidden in compact mode)
.overflow-x-auto.flex-1(v-if="!compact" class="hidden sm:block")
  table.w-full.border-collapse
    thead
      tr.bg-surface-2.border-b.border-gray-700.sticky.top-0.z-10
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-6.px-1
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-2 Pos
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-1 +/-
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-14.px-2 #
        th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2 Driver
        th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2(class="hidden lg:table-cell") Team
        th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2(class="hidden xl:table-cell") Car
        th.py-2.text-left.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.px-2 Class
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-2 CP
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-12.px-2 Laps
        th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-24.px-2 Gap
        th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-20.px-2(class="hidden md:table-cell") Int
        th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-18.px-1(
          v-for="s in 5"
          :key="s"
          class="hidden 2xl:table-cell"
        ) S{{ s }}
        th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-20.px-2 Last
        th.py-2.text-right.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-20.px-2(class="hidden md:table-cell") Best
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-10.px-2 Pit
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-14.px-2(class="hidden lg:table-cell" title="Predicted finish position based on current gap + pace over remaining laps") Pred
        th.py-2.text-center.text-xs.font-semibold.text-gray-500.uppercase.tracking-wider.w-14.px-2(class="hidden lg:table-cell" title="On Pace Alone") OPA
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
import { computed } from 'vue';
import { useLapHistory } from '../composables/useLapHistory';
import { useRaceState } from '../composables/useRaceState';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverCard from './DriverCard.vue';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverRow from './DriverRow.vue';

const props = withDefaults(defineProps<{ compact?: boolean; }>(), { compact: false });

const { filteredDrivers, sortedDrivers, selectedDriver, trackedDriver, getDriver } = useRaceState();
const { getLapHistory } = useLapHistory();

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
  // Leader row: "----LAP N"
  if (gap.startsWith('----LAP')) return 0;
  // Lapped cars: gap contains "LAP" (e.g. on a different lap than leader)
  // Check for lapped format — if driver.LAPS < leader.LAPS, gap is often "----LAP N"
  // For same-lap drivers, gap is a time string: "50.694" or "1:04.839" or "3:07.578"
  return parseLapTime(gap);
}

const NLS_RACE_DURATION_SECONDS = 4 * 60 * 60; // 4 hours

const predictedPositions = computed(() => {
  const sorted = sortedDrivers.value;
  if (sorted.length === 0) return new Map<string, number>();

  const leader = sorted[0];
  const leaderPace = getMedianPace(leader.STNR, leader.FASTESTLAP);
  const leaderLaps = Number(leader.LAPS) || 0;

  // Estimate remaining laps based on leader's pace
  let remainingLaps = 5; // fallback
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

    // Current gap in seconds
    let currentGap: number;
    if (driver.STNR === leader.STNR) {
      currentGap = 0;
    } else if (lapDiff > 0 && leaderPace) {
      // Lapped car: approximate gap as lap deficit × leader pace + any time gap
      const timeGap = parseGapToSeconds(driver.GAP, leaderPace);
      currentGap = lapDiff * (leaderPace) + (timeGap ?? 0);
    } else {
      currentGap = parseGapToSeconds(driver.GAP, leaderPace) ?? 0;
    }

    // Project gap change over remaining laps
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
