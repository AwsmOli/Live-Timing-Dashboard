<template lang="pug">
.flex.flex-col.h-full.bg-surface-0
  //- Header
  .flex.items-center.px-3.border-b.border-gray-800.shrink-0(class="py-1.5")
    span.text-xs.font-medium.text-gray-400.uppercase Live Ticker
    .flex-1
    span.text-xs.text-gray-600(v-if="loading") updating…

  //- Entries
  .flex-1.overflow-y-auto.min-h-0(class="scrollbar-thin")
    .px-3.py-2(v-if="entries.length === 0")
      span.text-xs.text-gray-500(v-if="error") Failed to load ticker
      span.text-xs.text-gray-500(v-else) No ticker entries yet

    .divide-y.divide-gray-800(v-else)
      .flex.gap-2.px-3.py-2(
        v-for="(entry, i) in entries"
        :key="i"
        :class="entry.isAlert ? 'bg-red-950/30' : ''"
      )
        span.text-xs.whitespace-nowrap.shrink-0(
          :class="entry.isAlert ? 'text-red-400 font-bold' : 'text-gray-500'"
        ) {{ entry.time }}
        span.text-xs(
          :class="entry.isAlert ? 'text-red-400 font-bold' : 'text-gray-300'"
        ) {{ entry.message }}
</template>

<script setup lang="ts">
import { useEventLog } from '../composables/useEventLog';

const { entries, loading, error } = useEventLog();
</script>
