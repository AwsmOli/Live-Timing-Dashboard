<template lang="pug">
.flex.flex-col.h-full.bg-surface-0
  //- Controls bar
  .flex.items-center.gap-3.px-4.py-2.border-b.border-gray-800.flex-wrap
    .text-xs.text-gray-400 Showing top
    select.bg-surface-2.text-gray-200.text-xs.rounded.px-2.py-1.border.border-gray-700(
      v-model.number="topN"
    )
      option(:value="10") 10
      option(:value="15") 15
      option(:value="20") 20
      option(:value="30") 30
      option(:value="0") All
    .text-xs.text-gray-400 drivers by
    select.bg-surface-2.text-gray-200.text-xs.rounded.px-2.py-1.border.border-gray-700(
      v-model="positionMode"
    )
      option(value="overall") Overall Position
      option(value="class") Class Position
    .text-xs.text-gray-500.ml-auto.flex.items-center.gap-1(v-if="trackedDriver")
      Crosshair(:size="12")
      | #{{ trackedDriver }}

  //- Chart area
  .flex-1.relative.overflow-hidden(ref="containerRef")
    canvas.absolute.inset-0(
      ref="canvasRef"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @click="onCanvasClick"
    )
    //- Tooltip
    .absolute.pointer-events-none.bg-surface-2.border.border-gray-700.rounded.px-2.py-1.text-xs.shadow-lg.z-10(
      v-if="tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    )
      .font-bold.text-white \#{{ tooltip.stnr }} {{ tooltip.name }}
      .text-gray-400 Lap {{ tooltip.lap }} — P{{ tooltip.position }}
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useLapHistory } from '../composables/useLapHistory';
import { useRaceState } from '../composables/useRaceState';
import { Crosshair } from 'lucide-vue-next';

const { sortedDrivers, filteredDrivers, trackedDriver, drivers, raceInfo } = useRaceState();
const { getLapHistory } = useLapHistory();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const topN = ref(15);
const positionMode = ref<'overall' | 'class'>('overall');
const tooltip = ref<{ x: number; y: number; stnr: string; name: string; lap: number; position: number; } | null>(null);

// Distinct line colors (bright, high-contrast on dark bg)
const LINE_COLORS = [
  '#2979ff', '#ff1744', '#00e676', '#ffea00', '#ff9100',
  '#d500f9', '#00e5ff', '#ff6d00', '#76ff03', '#f50057',
  '#651fff', '#1de9b6', '#ff3d00', '#64ffda', '#ffd740',
  '#e040fb', '#18ffff', '#ff6e40', '#b2ff59', '#ff80ab',
  '#7c4dff', '#69f0ae', '#ffab40', '#a7ffeb', '#ffe57f',
  '#ea80fc', '#84ffff', '#ffd180', '#ccff90', '#ff8a80',
];

interface ChartPoint {
  lap: number;
  position: number;
}

interface ChartLine {
  stnr: string;
  name: string;
  classname: string;
  color: string;
  points: ChartPoint[];
}

// Build chart data from lap history
const chartLines = computed<ChartLine[]>(() => {
  const driversToShow = filteredDrivers.value;
  // Sort by current position
  const sorted = [...driversToShow].sort((a, b) => Number(a.POSITION) - Number(b.POSITION));
  const limited = topN.value > 0 ? sorted.slice(0, topN.value) : sorted;

  const lines: ChartLine[] = [];
  for (let i = 0; i < limited.length; i++) {
    const d = limited[i];
    const laps = getLapHistory(d.STNR);
    if (laps.length === 0) continue;

    const points: ChartPoint[] = laps.map(l => ({
      lap: l.lapNumber,
      position: positionMode.value === 'class' ? l.classPosition : l.position,
    }));

    // Determine color: if tracked, use bright white. Otherwise cycle.
    const isTracked = d.STNR === trackedDriver.value;
    const color = isTracked ? '#ffffff' : LINE_COLORS[i % LINE_COLORS.length];

    lines.push({
      stnr: d.STNR,
      name: d.NAME,
      classname: d.CLASSNAME,
      color,
      points,
    });
  }
  return lines;
});

const maxLap = computed(() => {
  let max = 0;
  for (const line of chartLines.value) {
    for (const p of line.points) {
      if (p.lap > max) max = p.lap;
    }
  }
  return max;
});

const maxPos = computed(() => {
  let max = 0;
  for (const line of chartLines.value) {
    for (const p of line.points) {
      if (p.position > max) max = p.position;
    }
  }
  return Math.max(max, topN.value > 0 ? topN.value : max);
});

// Chart geometry
const MARGIN = { top: 30, right: 120, bottom: 50, left: 50 };
const SECTORS = 5;

function getCanvasSize() {
  const c = containerRef.value;
  if (!c) return { w: 800, h: 500 };
  return { w: c.clientWidth, h: c.clientHeight };
}

function drawChart() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const { w, h } = getCanvasSize();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const lines = chartLines.value;
  if (lines.length === 0 || maxLap.value === 0) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for lap data...', w / 2, h / 2);
    return;
  }

  const plotW = w - MARGIN.left - MARGIN.right;
  const plotH = h - MARGIN.top - MARGIN.bottom;
  const ml = maxLap.value;
  const mp = maxPos.value;
  const numSectors = raceInfo.sectorCount > 0 ? raceInfo.sectorCount + 1 : SECTORS;

  // X axis: each lap is divided into numSectors segments
  // Total X units = ml * numSectors
  const totalXUnits = ml * numSectors;

  function xForUnit(unit: number): number {
    if (totalXUnits === 0) return MARGIN.left;
    return MARGIN.left + (unit / totalXUnits) * plotW;
  }
  // Data points are plotted at the end of each lap (after last sector)
  function xForLap(lap: number): number {
    return xForUnit(lap * numSectors);
  }
  function yForPos(pos: number): number {
    return MARGIN.top + ((pos - 1) / (mp - 1 || 1)) * plotH;
  }

  // Grid lines
  // Horizontal (position lines)
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 0.5;
  for (let p = 1; p <= mp; p++) {
    const y = yForPos(p);
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, y);
    ctx.lineTo(w - MARGIN.right, y);
    ctx.stroke();
  }

  // Vertical grid: major lines at lap boundaries, minor dashed at sector boundaries
  for (let l = 1; l <= ml; l++) {
    // Sector dividers within this lap (minor, dashed)
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.3;
    ctx.setLineDash([3, 4]);
    for (let s = 1; s < numSectors; s++) {
      const x = xForUnit((l - 1) * numSectors + s);
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, h - MARGIN.bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Lap boundary (major, solid)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.7;
    const x = xForLap(l);
    ctx.beginPath();
    ctx.moveTo(x, MARGIN.top);
    ctx.lineTo(x, h - MARGIN.bottom);
    ctx.stroke();
  }
  // Lap 0 boundary
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, MARGIN.top);
  ctx.lineTo(MARGIN.left, h - MARGIN.bottom);
  ctx.stroke();

  // X axis labels
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  // Determine label density based on available space
  const lapWidthPx = plotW / (ml || 1);
  const showSectorLabels = lapWidthPx > 80; // only show S1-S5 if enough room
  const showEveryNthLap = lapWidthPx < 30 ? Math.ceil(30 / lapWidthPx) : 1;

  for (let l = 1; l <= ml; l++) {
    if (l % showEveryNthLap !== 0 && l !== ml) continue;

    if (showSectorLabels) {
      // Sector labels within each lap
      for (let s = 0; s < numSectors; s++) {
        const x = xForUnit((l - 1) * numSectors + s + 0.5);
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`S${s + 1}`, x, h - MARGIN.bottom + 13);
      }
    }
    // Lap number centered under the lap span
    const lapCenterX = xForUnit((l - 0.5) * numSectors);
    ctx.fillStyle = '#9ca3af';
    ctx.font = showSectorLabels ? 'bold 10px system-ui, sans-serif' : '11px system-ui, sans-serif';
    const labelY = showSectorLabels ? h - MARGIN.bottom + 26 : h - MARGIN.bottom + 16;
    ctx.fillText(`L${l}`, lapCenterX, labelY);
    ctx.font = '10px system-ui, sans-serif';
  }

  // Y axis — position numbers
  ctx.textAlign = 'right';
  const posStep = mp <= 20 ? 1 : mp <= 50 ? 5 : 10;
  for (let p = 1; p <= mp; p += posStep) {
    ctx.fillText(String(p), MARGIN.left - 8, yForPos(p) + 4);
  }
  // Y axis title
  ctx.save();
  ctx.translate(12, MARGIN.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Position', 0, 0);
  ctx.restore();

  // Draw lines — tracked on top
  const trackedLine = lines.find(l => l.stnr === trackedDriver.value);
  const otherLines = lines.filter(l => l.stnr !== trackedDriver.value);

  function drawLine(ctx: CanvasRenderingContext2D, line: ChartLine, lineWidth: number, alpha: number) {
    if (line.points.length < 2) return;
    ctx.strokeStyle = line.color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < line.points.length; i++) {
      const x = xForLap(line.points[i].lap);
      const y = yForPos(line.points[i].position);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Draw non-tracked lines
  for (const line of otherLines) {
    const dimmed = trackedLine ? 0.35 : 0.8;
    drawLine(ctx, line, trackedLine ? 1.5 : 2, dimmed);
  }
  // Draw tracked line on top
  if (trackedLine) {
    drawLine(ctx, trackedLine, 3, 1);
  }

  // End dots + right-side labels
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (const line of lines) {
    if (line.points.length === 0) continue;
    const last = line.points[line.points.length - 1];
    const x = xForLap(last.lap);
    const y = yForPos(last.position);

    // Dot
    ctx.fillStyle = line.color;
    const isTracked = line.stnr === trackedDriver.value;
    const dotRadius = isTracked ? 4 : 3;
    ctx.globalAlpha = isTracked ? 1 : (trackedLine ? 0.5 : 0.9);
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Label on right edge
    const labelX = w - MARGIN.right + 8;
    const labelY = yForPos(last.position);
    ctx.fillStyle = line.color;
    ctx.globalAlpha = isTracked ? 1 : (trackedLine ? 0.5 : 0.9);
    ctx.fillText(`P${last.position} #${line.stnr} ${line.name}`, labelX, labelY + 3);
    ctx.globalAlpha = 1;
  }

  // Store geometry for hit testing
  chartGeometry.value = { xForLap, yForPos, plotW, plotH, ml, mp };
}

const chartGeometry = ref<{
  xForLap: (lap: number) => number;
  yForPos: (pos: number) => number;
  plotW: number;
  plotH: number;
  ml: number;
  mp: number;
} | null>(null);

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value;
  const geo = chartGeometry.value;
  if (!canvas || !geo) { tooltip.value = null; return; }

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Find closest point
  let bestDist = 20; // max pixel distance
  let bestHit: typeof tooltip.value = null;

  for (const line of chartLines.value) {
    for (const p of line.points) {
      const px = geo.xForLap(p.lap);
      const py = geo.yForPos(p.position);
      const d = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (d < bestDist) {
        bestDist = d;
        bestHit = {
          x: mx + 12,
          y: my - 30,
          stnr: line.stnr,
          name: line.name,
          lap: p.lap,
          position: p.position,
        };
      }
    }
  }
  tooltip.value = bestHit;
}

function onMouseLeave() {
  tooltip.value = null;
}

function onCanvasClick(e: MouseEvent) {
  if (tooltip.value) {
    const { trackedDriver: td } = useRaceState();
    td.value = td.value === tooltip.value.stnr ? null : tooltip.value.stnr;
  }
}

// Redraw on data changes and resize
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  nextTick(drawChart);
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => drawChart());
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

watch([chartLines, maxLap, maxPos, trackedDriver], () => {
  drawChart();
});
</script>
