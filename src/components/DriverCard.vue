<template lang="pug">
.border-b.border-gray-800.cursor-pointer.transition-colors(
  :class="[driver._flashClass, isTracked ? 'tracked-card-sticky ring-2 ring-inset ring-racing-blue shadow-[inset_0_0_12px_rgba(41,121,255,0.15)]' : cardBgClass, 'active:bg-surface-3']"
  @click="$emit('track', driver.STNR)"
)
  //- Row 1: Position, Name, Class, Detail button
  .flex.items-center.gap-2.px-3.pt-2.pb-1
    //- Position
    .font-mono.font-bold.text-lg.w-8.text-center(:class="positionClass") {{ driver.POSITION }}
    //- Position change
    .w-6.text-center
      span.text-xs.font-bold.inline-flex.items-center(v-if="chg > 0" class="text-racing-green")
        ChevronUp(:size="14")
        | {{ chg }}
      span.text-xs.font-bold.inline-flex.items-center(v-else-if="chg < 0" class="text-racing-red")
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
    )
      Info(:size="16")

  //- Row 2: Team + Car
  .flex.items-center.gap-2.px-3.text-xs.text-gray-400.truncate(v-if="driver.TEAM")
    span.text-gray-500 {{ driver.TEAM }}
    span.text-gray-600(v-if="driver.CAR") · {{ driver.CAR }}

  //- Row 3: Key stats + PRED/OPA
  .flex.items-center.justify-between.px-3.py-1.gap-1
    .flex.items-center.gap-3.text-xs.font-mono
      span(:class="classPositionClass") P{{ driver.CLASSRANK }}
      span.text-gray-400 L{{ driver.LAPS }}
      span
        span.text-gray-600 Gap 
        span.text-gray-400 {{ displayGap || '–' }}
    .flex.items-center.gap-3.text-xs.font-mono
      span.text-gray-500.inline-flex.items-center.gap-1(v-if="Number(driver.PITSTOPCOUNT) > 0")
        Wrench(:size="10")
        | {{ driver.PITSTOPCOUNT }}
      span(v-if="predictedPosition")
        span.text-gray-600 PRED 
        span(:class="predClass") {{ predictedPosition }}
      span(v-if="opaPosition")
        span.text-gray-600 OPA 
        span(:class="opaClass") {{ opaPosition }}

  //- Row 4: Last/Best
  .flex.items-center.justify-between.px-3.py-1.gap-1
    .flex.items-center.gap-3.text-xs.font-mono
      span
        span.text-gray-600 Last 
        span(:class="lastLapClass") {{ driver.LASTLAPTIME || '–' }}
      span
        span.text-gray-600 Best 
        span(:class="bestLapClass") {{ driver.FASTESTLAP || '–' }}

  //- Row 5: Sectors (when available)
  .flex.items-center.px-3.pb-2.gap-1(v-if="hasSectors")
    .flex.items-center.gap-2.text-xs.font-mono.flex-wrap
      template(v-for="s in 5" :key="s")
        span.whitespace-nowrap.relative.pb-1(v-if="driver[`S${s}TIME`]" :class="sectorDeltaClass(s)")
          | S{{ s }} {{ sectorValue(s) }}
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
        span.whitespace-nowrap.relative.pb-1(v-else-if="driver._prevSectors[s - 1] && sectorDelta(s) !== null" :class="sectorDeltaClass(s)")
          span.opacity-40 S{{ s }} {{ sectorDelta(s) }}
          .absolute.bottom-0.left-0.right-0.rounded-full(
            v-if="currentSector === s"
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

const props = defineProps<{
  driver: DriverInternal;
  index: number;
  isTracked: boolean;
  trackedDriver: DriverInternal | null;
  predictedPosition: number | null;
  opaPosition: number | null;
}>();

defineEmits<{
  select: [stnr: string];
  track: [stnr: string];
}>();

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

const hasSectors = computed(() => {
  for (let s = 1; s <= 5; s++) {
    if (props.driver[`S${s}TIME`]) return true;
  }
  if (currentSector.value) return true;
  return props.driver._prevSectors?.some(s => s !== '') ?? false;
});

// Which sector the car is currently in (1-5), or null if lap completed
const currentSector = computed(() => {
  const lin = Number(props.driver.LASTINTERMEDIATENUMBER) || 0;
  if (lin < 0 || lin >= 10) return null;
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

function sectorValue(sectorNum: number): string | null {
  const time = props.driver[`S${sectorNum}TIME`] as string;
  if (!time) return null;
  const delta = sectorDelta(sectorNum);
  return delta ?? time;
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
