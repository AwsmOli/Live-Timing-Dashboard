<template lang="pug">
.flex.flex-col.h-full.bg-surface-0
  .relative.flex-1.min-h-0.bg-surface-0
    .absolute.inset-0.flex.items-center.justify-center.bg-surface-0.text-gray-500(v-if="!isLoaded")
      .text-sm.font-medium Loading GPS...

    iframe.absolute.inset-0.h-full.w-full.bg-surface-0.transition-opacity.duration-150(
      :src="GPS_BASE_URL"
      :class="isLoaded ? 'opacity-100' : 'opacity-0'"
      title="GPS tracking"
      frameborder="0"
      @load="isLoaded = true"
    )
</template>

<script setup lang="ts">
import { ref } from 'vue';

const GPS_BASE_URL = 'https://nords-gps.vercel.app/';

const isLoaded = ref(false);

</script>