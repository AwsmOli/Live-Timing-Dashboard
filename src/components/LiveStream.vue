<template lang="pug">
.flex.flex-col.h-full.bg-surface-0
  //- Stream selector bar
  .flex.items-center.gap-1.px-3.border-b.border-gray-800.overflow-x-auto.shrink-0(class="py-1.5 scrollbar-thin")
    button.text-xs.font-medium.rounded.px-3.py-1.transition-colors.whitespace-nowrap(
      v-for="stream in streams"
      :key="stream.videoId"
      :class="activeStreamId === stream.videoId ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'"
      @click="activeStreamId = stream.videoId"
    )
      span(v-if="stream.carNumber")
        span.text-gray-500.mr-1 #
        | {{ stream.carNumber }}
        span.ml-1.text-gray-500(v-if="getCarName(stream.carNumber)") {{ getCarName(stream.carNumber) }}
      span(v-else) {{ stream.label }}
    .flex-1
    button.text-xs.font-medium.rounded.px-2.py-1.transition-colors.hidden(class="lg:flex" :class="showChat ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'" @click="showChat = !showChat")
      MessageSquare(:size="14")
      span.ml-1 Chat

  //- Player area
  .flex.flex-1.min-h-0(v-if="activeStream")
    //- YouTube player
    .flex-1.min-w-0
      iframe.w-full.h-full(
        :src="playerUrl"
        allow="autoplay; fullscreen; encrypted-media"
        allowfullscreen
        frameborder="0"
      )
    //- YouTube live chat
    .w-80.border-l.border-gray-800.hidden(v-if="showChat" class="lg:block")
      iframe.w-full.h-full(
        :src="chatUrl"
        frameborder="0"
      )

  //- Empty state
  .flex.items-center.justify-center.flex-1.text-gray-500(v-else)
    .text-center
      .inline-block.ui-tooltip-anchor(data-tooltip="No streams available")
        MonitorOff(:size="48" class="mx-auto mb-3 text-gray-600")
      p.text-lg No streams available
      p.text-sm.mt-1 Streams will appear once the NLS live page is configured
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StreamInfo } from '../composables/useNlsConfig';
import { useNlsConfig } from '../composables/useNlsConfig';
import { useRaceState } from '../composables/useRaceState';
import { MonitorOff, MessageSquare } from 'lucide-vue-next';

const { config } = useNlsConfig();
const { drivers, trackedDriver } = useRaceState();

const streams = computed(() => config.value?.streams ?? [] as readonly StreamInfo[]);
const activeStreamId = ref<string | null>(localStorage.getItem('nls-activeStream'));
const showChat = ref(localStorage.getItem('nls-showChat') !== 'false');

// Auto-select the main stream on load
watch(streams, (s) => {
  if (s.length > 0 && !activeStreamId.value) {
    activeStreamId.value = s[0].videoId;
  }
}, { immediate: true });

watch(activeStreamId, (v) => { if (v) localStorage.setItem('nls-activeStream', v); });
watch(showChat, (v) => localStorage.setItem('nls-showChat', String(v)));

// If a tracked driver has a stream, switch to it
watch(trackedDriver, (stnr) => {
  if (!stnr || streams.value.length === 0) return;
  const match = streams.value.find(s => s.carNumber === stnr);
  if (match) {
    activeStreamId.value = match.videoId;
  }
});

const activeStream = computed(() =>
  streams.value.find(s => s.videoId === activeStreamId.value) ?? null
);

const playerUrl = computed(() => {
  if (!activeStream.value) return '';
  return `https://www.youtube.com/embed/${activeStream.value.videoId}?autoplay=1&rel=0`;
});

const chatUrl = computed(() => {
  if (!activeStream.value) return '';
  const domain = window.location.hostname;
  return `https://www.youtube.com/live_chat?v=${activeStream.value.videoId}&embed_domain=${domain}&dark_theme=1`;
});

function getCarName(carNumber: string | null): string | null {
  if (!carNumber) return null;
  for (const d of drivers.values()) {
    if (d.STNR === carNumber) return d.NAME;
  }
  return null;
}
</script>
