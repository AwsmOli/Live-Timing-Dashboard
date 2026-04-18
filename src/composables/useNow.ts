import { ref, onMounted, onUnmounted, getCurrentInstance } from "vue";

const now = ref(Date.now());
let refCount = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

function startTimer(intervalMs: number) {
  if (refCount === 0) {
    intervalId = setInterval(() => {
      now.value = Date.now();
    }, intervalMs);
  }
  refCount++;
}

function stopTimer() {
  refCount--;
  if (refCount === 0 && intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function useNow(intervalMs = 200) {
  if (getCurrentInstance()) {
    onMounted(() => startTimer(intervalMs));
    onUnmounted(() => stopTimer());
  } else {
    // Fallback: start immediately if called outside setup
    startTimer(intervalMs);
  }
  return now;
}
