import type { ComputedRef, Ref } from "vue";
import { computed, reactive, ref, watch } from "vue";
import type { Driver, DriverInternal, RaceData, RaceInfo } from "../models";
import { CLASS_ORDER } from "../utils/classColors";

const HIGHLIGHT_DURATION = 3000;
const CLASS_FILTER_STORAGE_KEY = "nls-selectedClasses";
const DEFAULT_SECTOR_COUNT = 5;
const MAX_SECTOR_COUNT = 9;

function clampSectorCount(count: number | null | undefined): number {
  if (!count || !Number.isFinite(count)) return DEFAULT_SECTOR_COUNT;
  return Math.max(1, Math.min(MAX_SECTOR_COUNT, Math.floor(count)));
}

function getSectorCountFromLengths(data: RaceData): number {
  for (
    let sectorNumber = MAX_SECTOR_COUNT;
    sectorNumber >= 1;
    sectorNumber -= 1
  ) {
    const lengthValue =
      Number(data[`S${sectorNumber}L` as keyof RaceData]) || 0;
    if (lengthValue > 0) return sectorNumber;
  }

  return 0;
}

function deriveSectorCount(data: RaceData): number {
  const intermediateCount = Number(data.NROFINTERMEDIATETIMES) || 0;
  const trackLengthSectorCount = getSectorCountFromLengths(data);

  return clampSectorCount(
    Math.max(
      trackLengthSectorCount,
      intermediateCount > 0 ? intermediateCount + 1 : 0,
    ),
  );
}

function loadSelectedClasses(): Set<string> {
  const stored = localStorage.getItem(CLASS_FILTER_STORAGE_KEY);
  if (!stored) return new Set();

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((value): value is string => typeof value === "string"),
    );
  } catch {
    return new Set();
  }
}

function getDisplayedSectorNumber(
  driver: Pick<Driver, "LASTINTERMEDIATENUMBER">,
  sectorCount = DEFAULT_SECTOR_COUNT,
): number | null {
  const normalizedSectorCount = clampSectorCount(sectorCount);
  const lin = Number(driver.LASTINTERMEDIATENUMBER) || 0;
  if (lin < 0 || lin >= normalizedSectorCount * 2) return null;
  return Math.floor(lin / 2) + 1;
}

function getCompletedSectorCount(
  driver: Pick<Driver, "LASTINTERMEDIATENUMBER">,
  sectorCount = DEFAULT_SECTOR_COUNT,
): number {
  const normalizedSectorCount = clampSectorCount(sectorCount);
  const lin = Number(driver.LASTINTERMEDIATENUMBER) || 0;
  if (lin <= 0) return 0;
  if (lin >= normalizedSectorCount * 2) return normalizedSectorCount;
  return Math.floor(lin / 2);
}

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
const selectedClasses: Ref<Set<string>> = ref(loadSelectedClasses());
const selectedDriver: Ref<string | null> = ref(null);
const trackedDriver: Ref<string | null> = ref(
  localStorage.getItem("nls-trackedDriver"),
);

watch(selectedClasses, (value) => {
  if (value.size > 0) {
    localStorage.setItem(CLASS_FILTER_STORAGE_KEY, JSON.stringify([...value]));
  } else {
    localStorage.removeItem(CLASS_FILTER_STORAGE_KEY);
  }
});

watch(trackedDriver, (v) => {
  if (v) localStorage.setItem("nls-trackedDriver", v);
  else localStorage.removeItem("nls-trackedDriver");
});

const sortedDrivers: ComputedRef<DriverInternal[]> = computed(() => {
  const arr = Array.from(drivers.values());
  const sectorCount = clampSectorCount(raceInfo.sectorCount);
  arr.sort((a, b) => {
    const posA = Number(a.POSITION) || 9999;
    const posB = Number(b.POSITION) || 9999;
    if (posA !== posB) return posA - posB;

    // Tiebreak by laps then sectors when POSITION is equal/missing
    const lapDelta = (Number(b.LAPS) || 0) - (Number(a.LAPS) || 0);
    if (lapDelta !== 0) return lapDelta;

    return (
      getCompletedSectorCount(b, sectorCount) -
      getCompletedSectorCount(a, sectorCount)
    );
  });
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

watch(availableClasses, (classes) => {
  if (classes.length === 0 || selectedClasses.value.size === 0) return;

  const validClasses = new Set(classes);
  const next = new Set(
    [...selectedClasses.value].filter((className) =>
      validClasses.has(className),
    ),
  );

  if (next.size !== selectedClasses.value.size) {
    selectedClasses.value = next;
  }
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
  raceInfo.sectorCount = deriveSectorCount(data);
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
  const sectorCount = clampSectorCount(raceInfo.sectorCount);

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
      ? Array.from({ length: sectorCount }, (_, index) => {
          const sectorNumber = index + 1;
          return (existing?.[`S${sectorNumber}TIME`] as string) || "";
        })
      : Array.from(
          { length: sectorCount },
          (_, index) => existing?._prevSectors?.[index] ?? "",
        );

    // Real feed updates can change the raw intermediate number twice inside the same sector.
    // Only reset the running sector timer when the displayed sector actually changes.
    const previousDisplayedSector = existing
      ? getDisplayedSectorNumber(existing, sectorCount)
      : null;
    const nextDisplayedSector = getDisplayedSectorNumber(entry, sectorCount);
    const sectorChanged =
      existing && previousDisplayedSector !== nextDisplayedSector;
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
