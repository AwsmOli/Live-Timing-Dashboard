<template lang="pug">
tr.cursor-pointer.transition-colors.border-b.border-gray-800(
  :class="[driver._flashClass, isTracked ? 'tracked-sticky bg-racing-blue/25 ring-2 ring-inset ring-racing-blue shadow-[inset_0_0_12px_rgba(41,121,255,0.15)] hover:bg-racing-blue/35' : [rowBgClass, 'hover:bg-surface-3']]"
  @click="$emit('track', driver.STNR)"
)
  //- Detail icon
  td.text-center.w-6(class="py-1 sm:py-1.5 px-0.5 sm:px-1")
    button.text-xs.opacity-50.transition-opacity(
      class="hover:opacity-100"
      :class="'text-gray-400'"
      @click.stop="$emit('select', driver.STNR)"
      title="Show details"
    )
      Info(:size="14")

  //- Position
  td.text-center.font-mono.font-bold.text-sm.w-10(class="py-1 sm:py-1.5 px-1 sm:px-2" :class="positionClass")
    | {{ driver.POSITION }}

  //- Position change
  td.text-center.w-10(class="py-1 sm:py-1.5 px-0.5 sm:px-1 hidden sm:table-cell")
    span.text-xs.font-bold.flex.items-center.justify-center(v-if="chg > 0" class="text-racing-green")
      ChevronUp(:size="14")
      | {{ chg }}
    span.text-xs.font-bold.flex.items-center.justify-center(v-else-if="chg < 0" class="text-racing-red")
      ChevronDown(:size="14")
      | {{ Math.abs(chg) }}
    span.text-xs.text-gray-600(v-else) –

  //- Car number
  td.text-center.font-mono.font-bold.text-sm.text-white(class="py-1 sm:py-1.5 px-1 sm:px-2 w-10 sm:w-14")
    | \#{{ driver.STNR }}

  //- Driver name
  td.text-sm.font-medium.text-white.whitespace-nowrap.truncate(class="py-1 sm:py-1.5 px-1 sm:px-2 max-w-20 sm:max-w-32")
    | {{ driver.NAME }}

  //- Team
  td.text-xs.text-gray-400.whitespace-nowrap.max-w-40.truncate(class="py-1.5 hidden lg:table-cell px-2")
    | {{ driver.TEAM }}

  //- Car
  td.text-xs.text-gray-500.whitespace-nowrap.max-w-36.truncate(class="py-1.5 hidden xl:table-cell px-2")
    | {{ driver.CAR }}

  //- Class badge
  td(class="py-1 sm:py-1.5 hidden sm:table-cell px-1 sm:px-2")
    span.rounded.text-xs.font-medium.whitespace-nowrap(
      class="px-1 sm:px-1.5 py-0.5"
      :class="`${classColor.bg} ${classColor.text}`"
    ) {{ driver.CLASSNAME }}

  //- Class position
  td.text-center.font-mono.text-xs.w-10(class="py-1 sm:py-1.5 hidden sm:table-cell px-1 sm:px-2" :class="classPositionClass")
    | P{{ driver.CLASSRANK }}

  //- Laps
  td.text-center.font-mono.text-sm.text-gray-300.w-12(class="py-1 sm:py-1.5 hidden sm:table-cell px-1 sm:px-2")
    | {{ driver.LAPS }}

  //- Gap
  td.text-right.font-mono.text-xs.text-gray-400.whitespace-nowrap(class="py-1 sm:py-1.5 px-1 sm:px-2 w-16 sm:w-24")
    | {{ displayGap }}

  //- Interval
  td.text-right.font-mono.text-xs.text-gray-400.whitespace-nowrap.w-20(class="py-1.5 hidden md:table-cell px-2")
    | {{ driver.INT }}

  //- Sector times S1-S5 (with deltas when tracking)
  td.text-right.font-mono.text-xs.whitespace-nowrap.w-18.relative(
    v-for="s in 5"
    :key="s"
    :class="[sectorDeltaClass(s)]"
    class="py-1.5 hidden 2xl:table-cell px-1"
  )
    template(v-if="sectorDelta(s) !== null")
      span(:class="isPrevSectorDelta(s) ? 'opacity-40' : ''") {{ sectorDelta(s) }}
    template(v-else-if="driver[`S${s}TIME`]")
      | {{ driver[`S${s}TIME`] }}
    template(v-else-if="currentSector === s")
      span(:class="sectorLate(s) ? 'text-racing-red' : 'text-racing-green'") {{ runningSectorTime(s) }}
    template(v-else-if="driver._prevSectors[s - 1]")
      span.opacity-40 {{ driver._prevSectors[s - 1] }}
    //- Progress bar for current sector
    .absolute.bottom-0.left-0.rounded-full(
      v-if="currentSector === s"
      class="h-1"
      :class="sectorBarHasRef(s) ? (sectorLate(s) ? 'bg-racing-red' : 'bg-racing-green') + ' transition-all duration-200' : 'bg-racing-blue/40 animate-pulse'"
      :style="{ width: sectorProgressPct(s) + '%', minWidth: '4px' }"
    )

  //- Last lap
  td.text-right.font-mono.text-xs.whitespace-nowrap(class="py-1 sm:py-1.5 px-1 sm:px-2 w-16 sm:w-20" :class="lastLapClass")
    | {{ driver.LASTLAPTIME || '–' }}

  //- Best lap
  td.text-right.font-mono.text-xs.whitespace-nowrap.w-20(class="py-1.5 hidden md:table-cell px-2" :class="bestLapClass")
    | {{ driver.FASTESTLAP || '–' }}

  //- Pit stops
  td.text-center.font-mono.text-xs.text-gray-400.w-10(class="py-1 sm:py-1.5 hidden sm:table-cell px-1 sm:px-2")
    | {{ driver.PITSTOPCOUNT }}

  //- Predicted position
  td.text-center.font-mono.text-xs.w-14.whitespace-nowrap(class="py-1.5 hidden lg:table-cell px-2")
    template(v-if="predictedPosition")
      span(:class="predClass") {{ predictedPosition }}
      span.ml-1.text-xxs.inline-flex.items-center(v-if="predDelta !== 0" :class="predDelta > 0 ? 'text-racing-green' : 'text-racing-red'")
        ChevronUp(v-if="predDelta > 0" :size="10")
        ChevronDown(v-else :size="10")
        | {{ Math.abs(predDelta) }}
    template(v-else)
      span.text-gray-600 –

  //- OPA position
  td.text-center.font-mono.text-xs.w-14.whitespace-nowrap(class="py-1.5 hidden lg:table-cell px-2")
    template(v-if="opaPosition")
      span(:class="opaClass") {{ opaPosition }}
      span.ml-1.text-xxs.inline-flex.items-center(v-if="opaDelta !== 0" :class="opaDelta > 0 ? 'text-racing-green' : 'text-racing-red'")
        ChevronUp(v-if="opaDelta > 0" :size="10")
        ChevronDown(v-else :size="10")
        | {{ Math.abs(opaDelta) }}
    template(v-else)
      span.text-gray-600 –
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DriverInternal } from '../models';
import { getClassColor } from '../utils/classColors';
import { Info, ChevronUp, ChevronDown } from 'lucide-vue-next';
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
  if (!props.trackedDriver || props.isTracked) return driver.value.GAP;
  const myGap = parseGapSeconds(driver.value.GAP);
  const refGap = parseGapSeconds(props.trackedDriver.GAP);
  if (myGap === null || refGap === null) return driver.value.GAP;
  const delta = myGap - refGap;
  const sign = delta >= 0 ? '+' : '-';
  const abs = Math.abs(delta);
  const mins = Math.floor(abs / 60);
  const secs = abs - mins * 60;
  if (mins > 0) return `${sign}${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
  return `${sign}${secs.toFixed(3)}`;
});

const driver = computed(() => props.driver);

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

const rowBgClass = computed(() => {
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

// Which sector the car is currently in (1-5), or null if lap completed
const currentSector = computed(() => {
  const lin = Number(props.driver.LASTINTERMEDIATENUMBER) || 0;
  if (lin < 0 || lin >= 10) return null;
  return Math.floor(lin / 2) + 1;
});

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
