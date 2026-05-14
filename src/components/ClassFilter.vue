<template lang="pug">
.flex.items-center.gap-2.px-4.py-2.overflow-x-auto.bg-surface-0.border-b.border-gray-800(
  ref="scrollEl"
  class="scrollbar-thin cursor-grab select-none"
  :class="{ 'cursor-grabbing': isDragging }"
  @mousedown="onMouseDown"
  @mousemove="onMouseMove"
  @mouseup="onMouseUp"
  @mouseleave="onMouseUp"
)
  button.px-3.py-1.rounded-full.text-xs.font-medium.whitespace-nowrap.transition-colors(
    :class="selectedClasses.size === 0 ? 'bg-racing-blue text-white' : 'bg-surface-2 text-gray-400 hover:bg-surface-3 hover:text-gray-200'"
    @click="selectedClasses = new Set()"
  ) All
  button.px-3.py-1.rounded-full.text-xs.font-medium.whitespace-nowrap.transition-colors(
    v-for="cls in availableClasses"
    :key="cls"
    :class="selectedClasses.has(cls) ? classActiveStyle(cls) : 'bg-surface-2 text-gray-400 hover:bg-surface-3 hover:text-gray-200'"
    @click.prevent="!didDrag && toggleClass(cls)"
  ) {{ cls }}
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRaceState } from '../composables/useRaceState';
import { getClassColor } from '../utils/classColors';

const { availableClasses, selectedClasses } = useRaceState();

const scrollEl = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const didDrag = ref(false);
let startX = 0;
let scrollLeft = 0;

function onMouseDown(e: MouseEvent) {
  if (!scrollEl.value) return;
  isDragging.value = true;
  didDrag.value = false;
  startX = e.pageX - scrollEl.value.offsetLeft;
  scrollLeft = scrollEl.value.scrollLeft;
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !scrollEl.value) return;
  e.preventDefault();
  const x = e.pageX - scrollEl.value.offsetLeft;
  const walk = x - startX;
  if (Math.abs(walk) > 4) didDrag.value = true;
  scrollEl.value.scrollLeft = scrollLeft - walk;
}

function onMouseUp() {
  isDragging.value = false;
}

function toggleClass(cls: string) {
  const next = new Set(selectedClasses.value);
  if (next.has(cls)) {
    next.delete(cls);
  } else {
    next.add(cls);
  }
  selectedClasses.value = next;
}

function classActiveStyle(cls: string) {
  const color = getClassColor(cls);
  return `${color.bg} ${color.text}`;
}
</script>
