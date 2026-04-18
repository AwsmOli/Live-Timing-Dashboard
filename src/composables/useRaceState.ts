import type { ComputedRef, Ref } from "vue";
import { computed, reactive, ref } from "vue";
import type { Driver, DriverInternal, RaceData, RaceInfo } from "../models";
import { CLASS_ORDER } from "../utils/classColors";

const HIGHLIGHT_DURATION = 3000;

// Singleton state
const raceInfo: RaceInfo = reactive({
  trackName: "",
  cup: "",
  heat: "",
  session: "",
  trackLength: 0,
  sectorCount: 0,
  tod: 0,
  raceStartTime: 0,
});

const drivers: Map<string, DriverInternal> = reactive(new Map());
const selectedClasses: Ref<Set<string>> = ref(new Set());
const selectedDriver: Ref<string | null> = ref(null);
const trackedDriver: Ref<string | null> = ref(null);

const sortedDrivers: ComputedRef<DriverInternal[]> = computed(() => {
  const arr = Array.from(drivers.values());
  arr.sort((a, b) => Number(a.POSITION) - Number(b.POSITION));
  return arr;
});

const availableClasses: ComputedRef<string[]> = computed(() => {
  const classSet = new Set<string>();
  for (const d of drivers.values()) {
    if (d.CLASSNAME) classSet.add(d.CLASSNAME);
  }
  const sorted = [...classSet].sort((a, b) => {
    const ia = CLASS_ORDER.indexOf(a);
    const ib = CLASS_ORDER.indexOf(b);
    const oa = ia === -1 ? 999 : ia;
    const ob = ib === -1 ? 999 : ib;
    return oa - ob;
  });
  return sorted;
});

const filteredDrivers: ComputedRef<DriverInternal[]> = computed(() => {
  if (selectedClasses.value.size === 0) return sortedDrivers.value;
  return sortedDrivers.value.filter((d) =>
    selectedClasses.value.has(d.CLASSNAME),
  );
});

const highlightTimers = new Map<string, ReturnType<typeof setTimeout>>();

function processRaceData(data: RaceData): void {
  if (data.TRACKNAME) raceInfo.trackName = data.TRACKNAME;
  if (data.CUP) raceInfo.cup = data.CUP;
  if (data.HEAT) raceInfo.heat = data.HEAT;
  if (data.SESSION) raceInfo.session = data.SESSION;
  if (data.TRACKLENGTH) raceInfo.trackLength = Number(data.TRACKLENGTH);
  if (data.NROFINTERMEDIATETIMES)
    raceInfo.sectorCount = Number(data.NROFINTERMEDIATETIMES);
  if (data.TOD) {
    raceInfo.tod = Number(data.TOD);
    // Estimate race start from TOD and leader's ETA/laps on first full update
    if (!raceInfo.raceStartTime && data.RESULT && data.RESULT.length > 0) {
      const leader = data.RESULT.find((d) => d.POSITION === "1");
      if (leader) {
        const leaderLaps = Number(leader.LAPS) || 0;
        const leaderEta = Number(leader.ETA) || 0;
        const lastLap = parseLapTimeToSeconds(leader.LASTLAPTIME);
        if (leaderLaps > 0 && lastLap && leaderEta > 0) {
          // ETA is when they'll finish their current lap
          // Approximate start = TOD - (laps completed × avg lap time)
          // Better: use ETA - remaining partial lap as current time reference
          const avgLap = lastLap; // rough approximation
          raceInfo.raceStartTime = raceInfo.tod - leaderLaps * avgLap * 1000;
        }
      }
    }
  }

  if (data.RESULT) {
    updateDrivers(data.RESULT);
  }
}

function parseLapTimeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  const val = parseFloat(timeStr);
  return isNaN(val) ? null : val;
}

function updateDrivers(results: Driver[]): void {
  for (const entry of results) {
    const stnr = entry.STNR;
    const existing = drivers.get(stnr);

    let positionDelta = 0;
    let flashClass: string | null = null;
    if (existing) {
      const oldPos = Number(existing.POSITION);
      const newPos = Number(entry.POSITION);
      if (newPos < oldPos) {
        positionDelta = oldPos - newPos;
        flashClass = "flash-gain";
      } else if (newPos > oldPos) {
        positionDelta = oldPos - newPos;
      }
    }

    // Capture sector times from previous update when laps change
    const lapsChanged = existing && existing.LAPS !== entry.LAPS;
    const prevSectors = lapsChanged
      ? [1, 2, 3, 4, 5].map((s) => (existing[`S${s}TIME`] as string) || "")
      : (existing?._prevSectors ?? ["", "", "", "", ""]);

    // Track when the car enters a new sector
    const sectorChanged =
      existing &&
      existing.LASTINTERMEDIATENUMBER !== entry.LASTINTERMEDIATENUMBER;
    const sectorEntryTime = sectorChanged
      ? Date.now()
      : (existing?._sectorEntryTime ?? Date.now());

    const driverData: DriverInternal = {
      ...entry,
      _positionDelta: positionDelta || (existing?._positionDelta ?? 0),
      _flashClass: flashClass || (existing?._flashClass ?? null),
      _changeTimestamp: flashClass
        ? Date.now()
        : (existing?._changeTimestamp ?? 0),
      _prevLaps: existing ? existing.LAPS : entry.LAPS,
      _prevPitCount: existing ? existing.PITSTOPCOUNT : entry.PITSTOPCOUNT,
      _prevPitSum: existing ? existing.PITSUM : entry.PITSUM,
      _prevName: existing ? existing.NAME : entry.NAME,
      _prevSectors: prevSectors,
      _sectorEntryTime: sectorEntryTime,
    };

    drivers.set(stnr, driverData);

    if (flashClass) {
      // If the same flash class is already active, briefly clear it to restart the animation
      if (existing?._flashClass === flashClass) {
        drivers.set(stnr, { ...driverData, _flashClass: null });
        requestAnimationFrame(() => {
          const d = drivers.get(stnr);
          if (d) {
            drivers.set(stnr, { ...d, _flashClass: flashClass });
          }
        });
      }

      if (highlightTimers.has(stnr)) {
        clearTimeout(highlightTimers.get(stnr));
      }
      highlightTimers.set(
        stnr,
        setTimeout(() => {
          const d = drivers.get(stnr);
          if (d) {
            drivers.set(stnr, { ...d, _flashClass: null, _positionDelta: 0 });
          }
          highlightTimers.delete(stnr);
        }, HIGHLIGHT_DURATION),
      );
    }
  }
}

function getDriver(stnr: string): DriverInternal | undefined {
  return drivers.get(stnr);
}

export function useRaceState() {
  return {
    raceInfo,
    drivers,
    sortedDrivers,
    availableClasses,
    filteredDrivers,
    selectedClasses,
    selectedDriver,
    trackedDriver,
    processRaceData,
    getDriver,
  };
}
