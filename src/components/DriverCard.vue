<template lang="pug">
.rounded-xl.border.border-gray-800.cursor-pointer.transition-colors(
  :data-driver-id="driver.STNR"
  :data-driver-pinned="isPinned ? 'true' : 'false'"
  :class="[driver._flashClass, isTracked ? 'tracked-card-sticky ring-2 ring-inset ring-racing-blue shadow-[inset_0_0_12px_rgba(41,121,255,0.15)]' : cardBgClass, 'active:bg-surface-3']"
  @click="$emit('track', driver.STNR)"
)
  template(v-if="layoutMode === 'intermediate'")
    .flex.items-start.gap-3.px-3.pt-3.pb-2
      .flex.items-start.gap-2.shrink-0
        .font-mono.font-bold.text-lg.w-8.text-center(:class="positionClass") {{ driver.POSITION }}
        .w-6.text-center(class="pt-0.5")
          span.text-xs.font-bold.inline-flex.items-center.ui-tooltip-anchor(v-if="chg > 0" class="text-racing-green" data-tooltip="Gained positions")
            ChevronUp(:size="14")
            | {{ chg }}
          span.text-xs.font-bold.inline-flex.items-center.ui-tooltip-anchor(v-else-if="chg < 0" class="text-racing-red" data-tooltip="Lost positions")
            ChevronDown(:size="14")
            | {{ Math.abs(chg) }}
          span.text-xs.text-gray-600(v-else) –
        .font-mono.font-bold.text-sm.text-white.w-10.text-center.pt-1 \#{{ driver.STNR }}
      .min-w-0.flex-1
        .flex.items-start.gap-2
          .min-w-0.flex-1
            .text-sm.font-medium.text-white.truncate {{ driver.NAME }}
            .text-xs.text-gray-400.truncate(v-if="driver.TEAM || driver.CAR")
              span(v-if="driver.TEAM") {{ driver.TEAM }}
              span.text-gray-600(v-if="driver.TEAM && driver.CAR")  · 
              span(v-if="driver.CAR") {{ driver.CAR }}
          span.rounded.text-xs.font-medium.whitespace-nowrap(
            class="mt-0.5 px-1.5 py-0.5"
            :class="`${classColor.bg} ${classColor.text}`"
          ) {{ driver.CLASSNAME }}
          button.text-sm.transition-opacity.text-gray-400.opacity-50.shrink-0(
            class="active:opacity-100"
            @click.stop="$emit('select', driver.STNR)"
            title="Show details"
            aria-label="Show driver details"
          )
            Info(:size="16")

    .flex.flex-nowrap.items-center.gap-3.px-3.pb-1.text-xs.font-mono.overflow-x-auto.scrollbar-hide
      .whitespace-nowrap.shrink-0
        span.text-gray-600 CP 
        span(:class="classPositionClass") {{ driver.CLASSRANK }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600 Laps 
        span.text-gray-400 {{ driver.LAPS }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600.inline-flex.items-center.gap-1.ui-tooltip-anchor(data-tooltip="Pit stops")
          Wrench(:size="10")
          | Pit
        span.text-gray-400.ml-1 {{ driver.PITSTOPCOUNT }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600 PRED 
        span(:class="predictedPosition ? predClass : 'text-gray-500'") {{ predictedPosition ?? '–' }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600 OPA 
        span(:class="opaPosition ? opaClass : 'text-gray-500'") {{ opaPosition ?? '–' }}

    .grid.grid-cols-2.gap-x-4.gap-y-1.px-3.pb-2.text-xs.font-mono(class="lg:grid-cols-4")
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Last 
        span(:class="lastLapClass") {{ driver.LASTLAPTIME || '–' }}
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Best 
        span(:class="bestLapClass") {{ driver.FASTESTLAP || '–' }}
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Gap 
        span.text-gray-400 {{ displayGap || '–' }}
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Int 
        span.text-gray-400 {{ driver.INT || '–' }}

  template(v-else)
    //- Row 1: Position, Name, Class, Detail button
    .flex.items-center.gap-2.px-3.pt-2.pb-1
      //- Position
      .font-mono.font-bold.text-lg.w-8.text-center(:class="positionClass") {{ driver.POSITION }}
      //- Position change
      .w-6.text-center
        span.text-xs.font-bold.inline-flex.items-center.ui-tooltip-anchor(v-if="chg > 0" class="text-racing-green" data-tooltip="Gained positions")
          ChevronUp(:size="14")
          | {{ chg }}
        span.text-xs.font-bold.inline-flex.items-center.ui-tooltip-anchor(v-else-if="chg < 0" class="text-racing-red" data-tooltip="Lost positions")
          ChevronDown(:size="14")
          | {{ Math.abs(chg) }}
        span.text-xs.text-gray-600(v-else) –
      //- Car number
      .font-mono.font-bold.text-sm.text-white.w-10.text-center \#{{ driver.STNR }}
      //- Driver name
      .text-sm.font-medium.text-white.truncate.flex-1 {{ driver.NAME }}
      //- Class badge
      span.rounded.text-xs.font-medium.whitespace-nowrap(
        class="px-1.5 py-0.5"
        :class="`${classColor.bg} ${classColor.text}`"
      ) {{ driver.CLASSNAME }}
      //- Detail button
      button.text-sm.transition-opacity.ml-1.text-gray-400.opacity-50(
        class="active:opacity-100"
        @click.stop="$emit('select', driver.STNR)"
        title="Show details"
        aria-label="Show driver details"
      )
        Info(:size="16")

    //- Row 2: Team + Car
    .flex.items-center.gap-2.px-3.text-xs.text-gray-400.truncate(v-if="driver.TEAM")
      span.text-gray-500 {{ driver.TEAM }}
      span.text-gray-600(v-if="driver.CAR") · {{ driver.CAR }}

    //- Row 3: Short stats
    .flex.flex-nowrap.items-center.gap-3.px-3.pb-1.text-xs.font-mono.overflow-x-auto.scrollbar-hide
      .whitespace-nowrap.shrink-0
        span.text-gray-600 CP 
        span(:class="classPositionClass") {{ driver.CLASSRANK }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600 Laps 
        span.text-gray-400 {{ driver.LAPS }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600.inline-flex.items-center.gap-1.ui-tooltip-anchor(data-tooltip="Pit stops")
          Wrench(:size="10")
          | Pit
        span.text-gray-400.ml-1 {{ driver.PITSTOPCOUNT }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600 PRED 
        span(:class="predictedPosition ? predClass : 'text-gray-500'") {{ predictedPosition ?? '–' }}
      .whitespace-nowrap.shrink-0
        span.text-gray-600 OPA 
        span(:class="opaPosition ? opaClass : 'text-gray-500'") {{ opaPosition ?? '–' }}

    //- Row 4: Long stats
    .grid.grid-cols-2.gap-x-4.gap-y-1.px-3.pb-2.text-xs.font-mono
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Last 
        span(:class="lastLapClass") {{ driver.LASTLAPTIME || '–' }}
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Best 
        span(:class="bestLapClass") {{ driver.FASTESTLAP || '–' }}
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Gap 
        span.text-gray-400 {{ displayGap || '–' }}
      .min-w-0.whitespace-nowrap
        span.text-gray-600 Int 
        span.text-gray-400 {{ driver.INT || '–' }}

  //- Row 5: Sectors (when available)
  .flex.items-center.px-3.pb-2.gap-1(v-if="hasSectors")
    .flex.items-center.gap-2.text-xs.font-mono.flex-wrap
      template(v-for="s in sectorNumbers" :key="s")
        span.whitespace-nowrap.relative.pb-1(v-if="sectorDelta(s) !== null" :class="sectorDeltaClass(s)")
          span(:class="isPrevSectorDelta(s) ? 'opacity-40' : ''") S{{ s }} {{ sectorDelta(s) }}
          .absolute.bottom-0.left-0.right-0.rounded-full(
            v-if="currentSector === s"
            class="h-1"
            :class="sectorBarHasRef(s) ? (sectorLate(s) ? 'bg-racing-red' : 'bg-racing-green') + ' transition-all duration-200' : 'bg-racing-blue/40 animate-pulse'"
            :style="{ width: sectorProgressPct(s) + '%', minWidth: '4px' }"
          )
        span.whitespace-nowrap.relative.pb-1(v-else-if="driver[`S${s}TIME`]" :class="sectorDeltaClass(s)")
          | S{{ s }} {{ driver[`S${s}TIME`] }}
          .absolute.bottom-0.left-0.right-0.rounded-full(
            v-if="currentSector === s"
            class="h-1"
            :class="sectorBarHasRef(s) ? (sectorLate(s) ? 'bg-racing-red' : 'bg-racing-green') + ' transition-all duration-200' : 'bg-racing-blue/40 animate-pulse'"
            :style="{ width: sectorProgressPct(s) + '%', minWidth: '4px' }"
          )
        span.whitespace-nowrap.relative.pb-1(v-else-if="currentSector === s" :class="sectorLate(s) ? 'text-racing-red' : 'text-racing-green'")
          | S{{ s }} {{ runningSectorTime(s) }}
          .absolute.bottom-0.left-0.right-0.rounded-full(
            class="h-1"
            :class="sectorBarHasRef(s) ? (sectorLate(s) ? 'bg-racing-red' : 'bg-racing-green') + ' transition-all duration-200' : 'bg-racing-blue/40 animate-pulse'"
            :style="{ width: sectorProgressPct(s) + '%', minWidth: '4px' }"
          )
        span.whitespace-nowrap.opacity-40.relative.pb-1(v-else-if="driver._prevSectors[s - 1]")
          | S{{ s }} {{ driver._prevSectors[s - 1] }}
          .absolute.bottom-0.left-0.right-0.rounded-full(
            v-if="currentSector === s"
            class="h-1"
            :class="sectorBarHasRef(s) ? (sectorLate(s) ? 'bg-racing-red' : 'bg-racing-green') + ' transition-all duration-200' : 'bg-racing-blue/40 animate-pulse'"
            :style="{ width: sectorProgressPct(s) + '%', minWidth: '4px' }"
          )
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DriverInternal } from '../models';
import { getClassColor } from '../utils/classColors';
import { Info, ChevronUp, ChevronDown, Wrench } from 'lucide-vue-next';
import { useNow } from '../composables/useNow';
import { useRaceState } from '../composables/useRaceState';

const props = defineProps<{
  driver: DriverInternal;
  index: number;
  isTracked: boolean;
  trackedDriver: DriverInternal | null;
  predictedPosition: number | null;
  opaPosition: number | null;
  layoutMode: 'stacked' | 'intermediate';
  isPinned?: boolean;
}>();

defineEmits<{
  select: [stnr: string];
  track: [stnr: string];
}>();

const { raceInfo } = useRaceState();

const chg = computed(() => Number(props.driver.CHG) || 0);

function parseGapSeconds(gap: string | undefined): number | null {
  if (!gap) return null;
  const s = gap.trim();
  if (s.startsWith('----') || s.startsWith('R') || !s) return null;
  const parts = s.split(':');
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  const val = parseFloat(s);
  return isNaN(val) ? null : val;
}

const displayGap = computed(() => {
  if (!props.trackedDriver || props.isTracked) return props.driver.GAP;
  const myGap = parseGapSeconds(props.driver.GAP);
  const refGap = parseGapSeconds(props.trackedDriver.GAP);
  if (myGap === null || refGap === null) return props.driver.GAP;
  const delta = myGap - refGap;
  const sign = delta >= 0 ? '+' : '-';
  const abs = Math.abs(delta);
  const mins = Math.floor(abs / 60);
  const secs = abs - mins * 60;
  if (mins > 0) return `${sign}${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
  return `${sign}${secs.toFixed(3)}`;
});

const predDelta = computed(() => {
  if (!props.predictedPosition) return 0;
  return Number(props.driver.POSITION) - props.predictedPosition;
});

const predClass = computed(() => {
  if (predDelta.value > 0) return 'text-racing-green';
  if (predDelta.value < 0) return 'text-racing-red';
  return 'text-gray-400';
});

const opaDelta = computed(() => {
  if (!props.opaPosition) return 0;
  return Number(props.driver.POSITION) - props.opaPosition;
});

const opaClass = computed(() => {
  if (opaDelta.value > 0) return 'text-racing-green';
  if (opaDelta.value < 0) return 'text-racing-red';
  return 'text-gray-400';
});

const classColor = computed(() => getClassColor(props.driver.CLASSNAME));

const cardBgClass = computed(() => {
  return props.index % 2 === 0 ? 'bg-surface-1' : 'bg-surface-0';
});

const positionClass = computed(() => {
  const pos = Number(props.driver.POSITION);
  if (pos === 1) return 'text-racing-yellow';
  if (pos === 2) return 'text-gray-300';
  if (pos === 3) return 'text-amber-600';
  return 'text-gray-400';
});

const classPositionClass = computed(() => {
  const pos = Number(props.driver.CLASSRANK);
  if (pos === 1) return 'text-racing-yellow';
  if (pos === 2) return 'text-gray-300';
  if (pos === 3) return 'text-amber-600';
  return 'text-gray-400';
});

const lastLapClass = computed(() => {
  const s = props.driver.LLTS;
  if (s === '2') return 'text-racing-purple font-bold';
  if (s === '1') return 'text-racing-green';
  return 'text-gray-300';
});

const bestLapClass = computed(() => {
  const s = props.driver.FLTS;
  if (s === '2') return 'text-racing-purple font-bold';
  if (s === '1') return 'text-racing-green';
  return 'text-gray-300';
});

const sectorNumbers = computed(() => Array.from({ length: Math.max(1, raceInfo.sectorCount || 5) }, (_, index) => index + 1));

const hasSectors = computed(() => {
  for (const s of sectorNumbers.value) {
    if (props.driver[`S${s}TIME`]) return true;
  }
  if (currentSector.value) return true;
  return props.driver._prevSectors?.some(s => s !== '') ?? false;
});

// Which sector the car is currently in, or null if lap completed
const currentSector = computed(() => {
  const lin = Number(props.driver.LASTINTERMEDIATENUMBER) || 0;
  const sectorCount = sectorNumbers.value.length;
  if (lin < 0 || lin >= sectorCount * 2) return null;
  return Math.floor(lin / 2) + 1;
});

function parseSectorTime(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  const val = parseFloat(timeStr);
  return isNaN(val) ? null : val;
}

function sectorDelta(sectorNum: number): string | null {
  if (!props.trackedDriver || props.isTracked) return null;
  const myTime = parseSectorTime(props.driver[`S${sectorNum}TIME`] as string)
    ?? parseSectorTime(props.driver._prevSectors[sectorNum - 1]);
  const refTime = parseSectorTime(props.trackedDriver[`S${sectorNum}TIME`] as string)
    ?? parseSectorTime(props.trackedDriver._prevSectors[sectorNum - 1]);
  if (myTime === null || refTime === null) return null;
  const delta = myTime - refTime;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}`;
}

function isPrevSectorDelta(sectorNum: number): boolean {
  if (!props.trackedDriver || props.isTracked) return false;
  return !props.driver[`S${sectorNum}TIME`] || !props.trackedDriver[`S${sectorNum}TIME`];
}

function sectorDeltaClass(sectorNum: number): string {
  if (props.trackedDriver && !props.isTracked) {
    const d = sectorDelta(sectorNum);
    if (d !== null) {
      return d.startsWith('-') ? 'text-racing-green font-bold' : 'text-racing-red';
    }
  }
  const statusKey = `ST${sectorNum}T`;
  const s = props.driver[statusKey];
  if (s === '2') return 'text-racing-purple font-bold';
  if (s === '1') return 'text-racing-green';
  return 'text-gray-400';
}

const now = useNow();

function sectorProgressPct(sectorNum: number): number {
  if (currentSector.value !== sectorNum) return 0;
  const expected = parseSectorTime(props.driver._prevSectors[sectorNum - 1]);
  if (!expected || expected <= 0) return 100; // no reference: full width pulsing
  const elapsed = (now.value - props.driver._sectorEntryTime) / 1000;
  return Math.min((elapsed / expected) * 100, 100);
}

function sectorLate(sectorNum: number): boolean {
  if (currentSector.value !== sectorNum) return false;
  const expected = parseSectorTime(props.driver._prevSectors[sectorNum - 1]);
  if (!expected || expected <= 0) return false;
  const elapsed = (now.value - props.driver._sectorEntryTime) / 1000;
  return elapsed > expected;
}

function sectorBarHasRef(sectorNum: number): boolean {
  const prev = props.driver._prevSectors[sectorNum - 1];
  const expected = parseSectorTime(prev);
  return !!expected && expected > 0;
}

function runningSectorTime(sectorNum: number): string {
  if (currentSector.value !== sectorNum) return '';
  const elapsed = (now.value - props.driver._sectorEntryTime) / 1000;
  if (elapsed < 0) return '0.0';
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed - mins * 60;
  if (mins > 0) return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(1)}`;
  return secs.toFixed(1);
}
</script>
