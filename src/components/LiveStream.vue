<template lang="pug">
.flex.flex-col.bg-surface-0.h-full
  //- Stream selector bar
  .flex.items-center.border-b.border-gray-800.shrink-0(class="py-1.5")
    .flex.items-center.gap-1.px-3.overflow-x-auto.flex-1.min-w-0(class="scrollbar-hide")
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
    .flex.items-center.gap-1.px-2.shrink-0.border-l.border-gray-800
      button.text-xs.font-medium.rounded.px-2.py-1.transition-colors.flex.items-center(
        :class="showMinimap ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'"
        @click="showMinimap = !showMinimap"
      )
        Map(:size="14")
        span.ml-1 Minimap
      button.text-xs.font-medium.rounded.px-2.py-1.transition-colors.flex.items-center(
        :class="showChat ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:text-white'"
        @click="showChat = !showChat"
      )
        MessageSquare(:size="14")
        span.ml-1 Chat

  //- Player area
  .flex(v-if="activeStream" class="lg:flex-1 lg:min-h-0")
    //- YouTube player — 16:9 on mobile, fills remaining height on desktop
    .relative.w-full.aspect-video(class="lg:aspect-auto lg:flex-1 lg:min-h-0")
      iframe.absolute.inset-0.w-full.h-full(
        :src="playerUrl"
        allow="autoplay; fullscreen; encrypted-media"
        allowfullscreen
        frameborder="0"
      )
      //- Minimap
      .absolute.rounded-full.overflow-hidden.border-2.border-racing-blue.z-10.minimap(
        v-if="showMinimap"
      )
        iframe.minimap__iframe(
          :src="gpsUrl"
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
import { MonitorOff, MessageSquare, Map } from 'lucide-vue-next';

const { config } = useNlsConfig();
const { drivers, trackedDriver } = useRaceState();

const streams = computed(() => config.value?.streams ?? [] as readonly StreamInfo[]);
const activeStreamId = ref<string | null>(localStorage.getItem('nls-activeStream'));
const showChat = ref(localStorage.getItem('nls-showChat') !== 'false');
const showMinimap = ref(localStorage.getItem('nls-showMinimap') === 'true');

// Auto-select the main stream on load
watch(streams, (s) => {
  if (s.length > 0 && !activeStreamId.value) {
    activeStreamId.value = s[0].videoId;
  }
}, { immediate: true });

watch(activeStreamId, (v) => { if (v) localStorage.setItem('nls-activeStream', v); });
watch(showChat, (v) => localStorage.setItem('nls-showChat', String(v)));
watch(showMinimap, (v) => localStorage.setItem('nls-showMinimap', String(v)));

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

const gpsUrl = computed(() => {
  const base = 'https://nords-gps.vercel.app/';
  return trackedDriver.value ? `${base}?follow=${encodeURIComponent(trackedDriver.value)}` : base;
});

function getCarName(carNumber: string | null): string | null {
  if (!carNumber) return null;
  for (const d of drivers.values()) {
    if (d.STNR === carNumber) return d.NAME;
  }
  return null;
}
</script>

<style lang="scss" scoped>
.minimap {
  --minimap-size: min(299px, 20%);
  position: absolute;
  top: 35px;
  right: 35px;
  width: var(--minimap-size);
  aspect-ratio: 1;
  opacity: 0.9;
  pointer-events: none;
  box-shadow: 0 0 24px rgba(41, 121, 255, 0.4);

  &__iframe {
    position: absolute;
    width: 300%;
    height: 300%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>
