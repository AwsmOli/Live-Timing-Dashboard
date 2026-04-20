import { reactive } from "vue";
import type {
  CarHistory,
  Driver,
  DriverChange,
  DriverInternal,
  LapRecord,
  PitStop,
} from "../models";

const carHistories: Map<string, CarHistory> = reactive(new Map());
const DEFAULT_SECTOR_COUNT = 5;
const MAX_SECTOR_COUNT = 9;

function getSectorCount(driver: Driver | DriverInternal): number {
  for (
    let sectorNumber = MAX_SECTOR_COUNT;
    sectorNumber >= 1;
    sectorNumber -= 1
  ) {
    const key = `S${sectorNumber}TIME`;
    if (key in driver) return sectorNumber;
  }

  return DEFAULT_SECTOR_COUNT;
}

function ensureCar(stnr: string): CarHistory {
  if (!carHistories.has(stnr)) {
    carHistories.set(stnr, {
      laps: [],
      pitStops: [],
      driverChanges: [],
      drivers: [],
    });
  }
  return carHistories.get(stnr)!;
}

function parsePitSum(pitSumStr: string): number {
  return parseFloat(pitSumStr) || 0;
}

/**
 * Called on every race state update to detect lap completions, pit stops, and driver changes.
 * Must be called BEFORE useRaceState updates its internal state (so we can diff previous vs new).
 */
export function processLapHistoryUpdate(
  results: Driver[],
  drivers: Map<string, DriverInternal>,
): void {
  for (const entry of results) {
    const stnr = entry.STNR;
    const existing = drivers.get(stnr);
    const history = ensureCar(stnr);

    if (entry.NAME && !history.drivers.includes(entry.NAME)) {
      history.drivers.push(entry.NAME);
    }

    if (!existing) {
      continue;
    }

    const prevLaps = Number(existing.LAPS);
    const newLaps = Number(entry.LAPS);
    const prevPitCount = Number(existing.PITSTOPCOUNT);
    const newPitCount = Number(entry.PITSTOPCOUNT);

    if (newLaps > prevLaps && entry.LASTLAPTIME) {
      const sectorCount = getSectorCount(existing);
      const lap: LapRecord = {
        lapNumber: newLaps,
        lapTime: entry.LASTLAPTIME,
        llts: entry.LLTS,
        sectors: Array.from({ length: sectorCount }, (_, index) => {
          const sectorNumber = index + 1;
          return (existing[`S${sectorNumber}TIME`] as string) || "";
        }),
        position: Number(entry.POSITION),
        classPosition: Number(entry.CLASSRANK),
        timestamp: Date.now(),
        isPitIn: newPitCount > prevPitCount,
        driverName: entry.NAME,
      };
      history.laps.push(lap);
    }

    if (newPitCount > prevPitCount) {
      const prevPitSum = parsePitSum(existing.PITSUM);
      const newPitSum = parsePitSum(entry.PITSUM);
      const estimatedDuration = newPitSum - prevPitSum;

      const pit: PitStop = {
        pitNumber: newPitCount,
        atLap: newLaps,
        estimatedDuration: estimatedDuration > 0 ? estimatedDuration : null,
        totalPitTime: newPitSum,
        timestamp: Date.now(),
        driverOut: entry.NAME,
      };
      history.pitStops.push(pit);
    }

    if (existing.NAME && entry.NAME && existing.NAME !== entry.NAME) {
      const change: DriverChange = {
        fromDriver: existing.NAME,
        toDriver: entry.NAME,
        atLap: newLaps,
        timestamp: Date.now(),
      };
      history.driverChanges.push(change);
    }
  }
}

export function useLapHistory() {
  function getLapHistory(stnr: string | null): LapRecord[] {
    if (!stnr) return [];
    return carHistories.get(stnr)?.laps || [];
  }

  function getPitStops(stnr: string | null): PitStop[] {
    if (!stnr) return [];
    return carHistories.get(stnr)?.pitStops || [];
  }

  function getDriverChanges(stnr: string | null): DriverChange[] {
    if (!stnr) return [];
    return carHistories.get(stnr)?.driverChanges || [];
  }

  function getDriversSeen(stnr: string | null): string[] {
    if (!stnr) return [];
    return carHistories.get(stnr)?.drivers || [];
  }

  return {
    getLapHistory,
    getPitStops,
    getDriverChanges,
    getDriversSeen,
    processLapHistoryUpdate,
  };
}
