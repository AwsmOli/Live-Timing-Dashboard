<template lang="pug">
//- Backdrop
Transition(name="fade")
  .fixed.inset-0.bg-black.bg-opacity-50.z-40(
    v-if="selectedDriver"
    @click="selectedDriver = null"
  )

//- Slide-in panel
Transition(name="slide")
  .fixed.top-0.right-0.h-full.w-full.max-w-2xl.bg-surface-1.z-50.flex.flex-col.shadow-2xl(
    v-if="selectedDriver && driver"
  )
    //- Header
    .flex.items-start.justify-between.p-4.border-b.border-gray-800.bg-surface-2
      .flex-1
        .flex.items-center.gap-3.mb-2
          .text-3xl.font-mono.font-bold.text-white \#{{ driver.STNR }}
          .text-xl.font-bold.text-white {{ driver.NAME }}
          span.px-2.rounded.text-xs.font-medium(class="py-0.5"
            :class="`${classColor.bg} ${classColor.text}`"
          ) {{ driver.CLASSNAME }}
        .flex.items-center.gap-4.text-sm.text-gray-400
          span {{ driver.TEAM }}
          span.text-gray-600 •
          span {{ driver.CAR }}
        .flex.items-center.gap-4.mt-2
          .flex.items-center.gap-1
            Trophy(:size="12" class="text-gray-500")
            span.font-mono.font-bold.text-white P{{ driver.POSITION }}
          .flex.items-center.gap-1
            Flag(:size="12" class="text-gray-500")
            span.font-mono.font-bold.text-white P{{ driver.CLASSRANK }}
          .flex.items-center.gap-1
            RotateCw(:size="12" class="text-gray-500")
            span.font-mono.text-white {{ driver.LAPS }}
          .flex.items-center.gap-1
            WrenchIcon(:size="12" class="text-gray-500")
            span.font-mono.text-white {{ driver.PITSTOPCOUNT }}
          .flex.items-center.gap-1(v-if="driver.TPST")
            Timer(:size="12" class="text-gray-500")
            span.font-mono.text-white {{ driver.TPST }}
      button.text-gray-400.p-1.rounded.transition-colors(
        class="hover:text-white hover:bg-surface-3"
        @click="selectedDriver = null"
      )
        X(:size="24")

    //- Driver stints bar
    .px-4.py-3.border-b.border-gray-800(v-if="driversSeen.length > 1")
      .text-xs.text-gray-500.mb-1.uppercase.font-semibold.flex.items-center.gap-1
        Users(:size="12")
        | Driver Stints
      .flex.h-6.rounded.overflow-hidden.bg-surface-0
        .flex.items-center.justify-center.text-xs.font-medium(
          v-for="(driverName, idx) in driversSeen"
          :key="driverName"
          :style="stintStyle(idx)"
          :class="driverName === driver.NAME ? 'opacity-100' : 'opacity-60'"
        ) {{ driverName }}

    //- Tabs
    .flex.border-b.border-gray-800.px-4
      button.px-3.py-2.text-sm.font-medium.border-b-2.transition-colors.flex.items-center.gap-1(
        :class="activeTab === 'laps' ? 'border-racing-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'"
        @click="activeTab = 'laps'"
      )
        RotateCw(:size="14")
        | Laps ({{ lapHistory.length }})
      button.px-3.py-2.text-sm.font-medium.border-b-2.transition-colors.flex.items-center.gap-1(
        :class="activeTab === 'pits' ? 'border-racing-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'"
        @click="activeTab = 'pits'"
      )
        WrenchIcon(:size="14")
        | Pit Stops ({{ pitStops.length }})
      button.px-3.py-2.text-sm.font-medium.border-b-2.transition-colors.flex.items-center.gap-1(
        :class="activeTab === 'drivers' ? 'border-racing-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'"
        @click="activeTab = 'drivers'"
      )
        ArrowRightLeft(:size="14")
        | Driver Changes ({{ driverChanges.length }})

    //- Content
    .flex-1.overflow-y-auto.p-4

      //- Laps tab
      div(v-if="activeTab === 'laps'")
        .text-xs.text-gray-500.mb-2.italic(v-if="lapHistory.length === 0")
          | No laps recorded yet. Laps are accumulated from when you connected.
        table.w-full.border-collapse(v-else)
          thead
            tr.border-b.border-gray-700
              th.px-2.py-1.text-left.text-xs.text-gray-500.font-semibold Lap
              th.px-2.py-1.text-right.text-xs.text-gray-500.font-semibold Time
              th.px-2.py-1.text-right.text-xs.text-gray-500.font-semibold S1
              th.px-2.py-1.text-right.text-xs.text-gray-500.font-semibold S2
              th.px-2.py-1.text-right.text-xs.text-gray-500.font-semibold S3
              th.px-2.py-1.text-right.text-xs.text-gray-500.font-semibold S4
              th.px-2.py-1.text-right.text-xs.text-gray-500.font-semibold S5
              th.px-2.py-1.text-center.text-xs.text-gray-500.font-semibold Pos
              th.px-2.py-1.text-center.text-xs.text-gray-500.font-semibold CP
              th.px-2.py-1.text-center.text-xs.text-gray-500.font-semibold
          tbody
            tr.border-b.border-gray-800(
              v-for="lap in lapHistory"
              :key="lap.lapNumber"
              :class="lap.lapNumber === bestLapNumber ? 'bg-racing-green/10' : ''"
            )
              td.px-2.py-1.font-mono.text-sm.text-gray-300 {{ lap.lapNumber }}
              td.px-2.py-1.font-mono.text-sm.text-right(:class="lapTimeClass(lap)")
                | {{ lap.lapTime }}
              td.px-2.py-1.font-mono.text-xs.text-right.text-gray-400 {{ lap.s1 || '–' }}
              td.px-2.py-1.font-mono.text-xs.text-right.text-gray-400 {{ lap.s2 || '–' }}
              td.px-2.py-1.font-mono.text-xs.text-right.text-gray-400 {{ lap.s3 || '–' }}
              td.px-2.py-1.font-mono.text-xs.text-right.text-gray-400 {{ lap.s4 || '–' }}
              td.px-2.py-1.font-mono.text-xs.text-right.text-gray-400 {{ lap.s5 || '–' }}
              td.px-2.py-1.font-mono.text-xs.text-center.text-gray-300 {{ lap.position }}
              td.px-2.py-1.font-mono.text-xs.text-center.text-gray-400 {{ lap.classPosition }}
              td.px-2.py-1.text-center
                WrenchIcon(v-if="lap.isPitIn" :size="12" class="text-gray-400 inline" title="Pit stop")
                ArrowRightLeft(v-if="isDriverChangeLap(lap.lapNumber)" :size="12" class="text-gray-400 inline ml-1" title="Driver change")

      //- Pit stops tab
      div(v-if="activeTab === 'pits'")
        .text-xs.text-gray-500.mb-2.italic(v-if="pitStops.length === 0")
          | No pit stops recorded yet.
        .space-y-2(v-else)
          .bg-surface-2.rounded-lg.p-3.flex.items-center.justify-between(
            v-for="pit in pitStops"
            :key="pit.pitNumber"
          )
            .flex.items-center.gap-3
              .w-8.h-8.rounded-full.bg-surface-3.flex.items-center.justify-center.font-mono.font-bold.text-sm.text-white
                | {{ pit.pitNumber }}
              div
                .text-sm.text-white Pit Stop \#{{ pit.pitNumber }}
                .text-xs.text-gray-400 At lap {{ pit.atLap }}
            .text-right
              .font-mono.text-sm.text-white(v-if="pit.estimatedDuration")
                | {{ formatDuration(pit.estimatedDuration) }}
              .text-xs.text-gray-400 {{ pit.driverOut }} out

      //- Driver changes tab
      div(v-if="activeTab === 'drivers'")
        .text-xs.text-gray-500.mb-2.italic(v-if="driverChanges.length === 0")
          | No driver changes recorded yet. Changes are detected when the driver name changes for this car.
        .space-y-2(v-else)
          .bg-surface-2.rounded-lg.p-3.flex.items-center.gap-3(
            v-for="(change, idx) in driverChanges"
            :key="idx"
          )
            .w-8.h-8.rounded-full.bg-surface-3.flex.items-center.justify-center
              ArrowRightLeft(:size="16" class="text-gray-300")
            div
              .text-sm.text-white
                span.text-gray-400 {{ change.fromDriver }}
                span.mx-2 →
                span.font-medium {{ change.toDriver }}
              .text-xs.text-gray-400 At lap {{ change.atLap }}
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLapHistory } from '../composables/useLapHistory';
import { useRaceState } from '../composables/useRaceState';
import type { DetailTab, LapRecord } from '../models';
import { getClassColor, STINT_COLORS } from '../utils/classColors';
import { X, Trophy, Flag, RotateCw, Wrench as WrenchIcon, Timer, Users, ArrowRightLeft } from 'lucide-vue-next';

const { selectedDriver, getDriver } = useRaceState();
const { getLapHistory, getPitStops, getDriverChanges, getDriversSeen } = useLapHistory();

const activeTab = ref<DetailTab>('laps');

const driver = computed(() => {
  if (!selectedDriver.value) return null;
  return getDriver(selectedDriver.value);
});

const classColor = computed(() => {
  if (!driver.value) return { bg: '', text: '' };
  return getClassColor(driver.value.CLASSNAME);
});

const lapHistory = computed(() => getLapHistory(selectedDriver.value));
const pitStops = computed(() => getPitStops(selectedDriver.value));
const driverChanges = computed(() => getDriverChanges(selectedDriver.value));
const driversSeen = computed(() => getDriversSeen(selectedDriver.value));

const bestLapNumber = computed(() => {
  if (lapHistory.value.length === 0) return null;
  let best = null;
  let bestTime = Infinity;
  for (const lap of lapHistory.value) {
    const t = parseLapTime(lap.lapTime);
    if (t < bestTime) {
      bestTime = t;
      best = lap.lapNumber;
    }
  }
  return best;
});

const driverChangeLaps = computed(() => {
  return new Set(driverChanges.value.map(c => c.atLap));
});

function isDriverChangeLap(lapNum) {
  return driverChangeLaps.value.has(lapNum);
}

function parseLapTime(timeStr: string | undefined): number {
  if (!timeStr) return Infinity;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(timeStr) || Infinity;
}

function lapTimeClass(lap: LapRecord) {
  if (lap.llts === '2') return 'text-racing-purple font-bold';
  if (lap.llts === '1') return 'text-racing-green';
  if (lap.lapNumber === bestLapNumber.value) return 'text-racing-green';
  return 'text-white';
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

function stintStyle(idx: number) {
  const count = driversSeen.value.length;
  return {
    flex: 1,
    backgroundColor: STINT_COLORS[idx % STINT_COLORS.length],
  };
}
</script>
