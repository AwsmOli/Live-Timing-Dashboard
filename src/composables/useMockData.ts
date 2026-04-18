import { readonly, ref } from "vue";
import type { ConnectionStatus, DataSource, Driver, RaceData } from "../models";

// Simulated grid of 20 cars across 3 classes
const MOCK_CARS: {
  stnr: string;
  name: string;
  team: string;
  car: string;
  classname: string;
  basePace: number; // base lap time in seconds (Nordschleife ~8-10 min)
  variance: number; // random variance in seconds
}[] = [
  {
    stnr: "77",
    name: "Frijns",
    team: "Abt Sportsline",
    car: "Audi R8 LMS GT3",
    classname: "SP9 PRO",
    basePace: 485,
    variance: 8,
  },
  {
    stnr: "911",
    name: "Güven",
    team: "Manthey Racing",
    car: "Porsche 911 GT3 R",
    classname: "SP9 PRO",
    basePace: 487,
    variance: 9,
  },
  {
    stnr: "47",
    name: "Kobayashi",
    team: "KCMG",
    car: "BMW M4 GT3",
    classname: "SP9 PRO",
    basePace: 488,
    variance: 10,
  },
  {
    stnr: "65",
    name: "Kolb",
    team: "Falken Motorsports",
    car: "Porsche 911 GT3 R",
    classname: "SP9 PRO",
    basePace: 490,
    variance: 10,
  },
  {
    stnr: "23",
    name: "Zsigo",
    team: "Walkenhorst",
    car: "BMW M4 GT3",
    classname: "SP9 PRO",
    basePace: 491,
    variance: 11,
  },
  {
    stnr: "5",
    name: "Arrow",
    team: "GetSpeed Performance",
    car: "Mercedes-AMG GT3",
    classname: "SP9 PRO",
    basePace: 492,
    variance: 10,
  },
  {
    stnr: "632",
    name: "Brown",
    team: "Toyota Racing",
    car: "Toyota GR Supra GT4",
    classname: "SP10",
    basePace: 530,
    variance: 12,
  },
  {
    stnr: "177",
    name: "Harrison",
    team: "Black Falcon",
    car: "BMW M4 GT4 EVO",
    classname: "SP10",
    basePace: 533,
    variance: 13,
  },
  {
    stnr: "180",
    name: "Turner",
    team: "Black Falcon",
    car: "BMW M4 GT4 EVO",
    classname: "SP10",
    basePace: 535,
    variance: 12,
  },
  {
    stnr: "164",
    name: "Schöll",
    team: "W+S Motorsport",
    car: "Porsche 718 GT4 CS RS",
    classname: "SP10",
    basePace: 538,
    variance: 14,
  },
  {
    stnr: "962",
    name: "Oberheim",
    team: "W+S Motorsport",
    car: "Porsche 718 Cayman GT4",
    classname: "CUP3",
    basePace: 525,
    variance: 12,
  },
  {
    stnr: "961",
    name: "Goodman",
    team: "W+S Motorsport",
    car: "Porsche 718 Cayman GT4",
    classname: "CUP3",
    basePace: 527,
    variance: 13,
  },
  {
    stnr: "944",
    name: "Oehme",
    team: "Schmickler Performance",
    car: "Porsche 718 Cayman GT4",
    classname: "CUP3",
    basePace: 530,
    variance: 14,
  },
  {
    stnr: "971",
    name: "Braun",
    team: "SRS Sorg Rennsport",
    car: "Porsche 718 Cayman GT4",
    classname: "CUP3",
    basePace: 532,
    variance: 15,
  },
  {
    stnr: "977",
    name: "Sacchi",
    team: "SRS Sorg Rennsport",
    car: "Porsche 718 Cayman GT4",
    classname: "CUP3",
    basePace: 535,
    variance: 14,
  },
  {
    stnr: "901",
    name: "Grosse",
    team: "Mühlner Motorsport",
    car: "Porsche 911 GT3 Cup",
    classname: "CUP2",
    basePace: 510,
    variance: 12,
  },
  {
    stnr: "900",
    name: "Hites",
    team: "Mühlner Motorsport",
    car: "Porsche 911 GT3 Cup",
    classname: "CUP2",
    basePace: 512,
    variance: 13,
  },
  {
    stnr: "904",
    name: "Rump",
    team: "Team LIQUI MOLY",
    car: "Porsche 911 GT3 Cup",
    classname: "CUP2",
    basePace: 515,
    variance: 14,
  },
  {
    stnr: "919",
    name: "Jodexnis",
    team: "Hofor Racing",
    car: "Porsche 911 GT3 Cup",
    classname: "CUP2",
    basePace: 518,
    variance: 15,
  },
  {
    stnr: "925",
    name: "Walker",
    team: "Huber Motorsport",
    car: "Porsche 911 GT3 Cup",
    classname: "CUP2",
    basePace: 520,
    variance: 14,
  },
];

// Nordschleife sector time distribution ratios
// Based on sector lengths: S1=2745m, S2=3004m, S3=6003m, S4=9409m, S5=3197m
const SECTOR_RATIOS = [0.14, 0.14, 0.28, 0.3, 0.14] as const;

// Gaussian random via Box-Muller transform
function gaussianRandom(mean = 0, stdDev = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return (
    mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  );
}

function formatLapTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(3);
  return `${min}:${sec.padStart(6, "0")}`;
}

function formatSectorTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(3);
  return min > 0 ? `${min}:${sec.padStart(6, "0")}` : sec.padStart(6, "0");
}

// Time scale: compress real sector times for testing
// 1.0 = real-time (~8min laps), 0.5 = 2x speed (~4min laps)
const TIME_SCALE = 1.0;

interface CarState {
  stnr: string;
  name: string;
  currentDriverIndex: number;
  drivers: string[];
  laps: number;
  totalTime: number;
  lastLapTime: number;
  bestLapTime: number;
  pitCount: number;
  pitSumSeconds: number;
  nextPitLap: number; // schedule pit stops
  lastSectors: string[]; // completed lap's sectors (shown until overwritten)
  sectorProgress: number; // 0-5: how many sectors completed on current lap
  pendingSectors: string[]; // pre-computed formatted sector times
  pendingSectorSeconds: number[]; // pre-computed sector durations in seconds
  pendingLapTime: number; // pre-computed total lap time
  pendingIsPit: boolean; // whether current lap is a pit lap
  sectorEntryTime: number; // Date.now() when car entered current sector
  llts: string;
  flts: string;
}

export function useMockData(onMessage: (data: RaceData) => void): DataSource {
  const connectionStatus = ref<ConnectionStatus>("disconnected");
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  // Simulation state
  const carStates: CarState[] = [];
  let simLapPhase = 0; // tracks which batch of laps we're on

  function initCarStates() {
    carStates.length = 0;
    for (const car of MOCK_CARS) {
      const driverNames = [car.name, car.name + " B"]; // each car has 2 drivers
      carStates.push({
        stnr: car.stnr,
        name: car.name,
        currentDriverIndex: 0,
        drivers: driverNames,
        laps: 0,
        totalTime: 0,
        lastLapTime: 0,
        bestLapTime: Infinity,
        pitCount: 0,
        pitSumSeconds: 0,
        nextPitLap: 7 + Math.floor(Math.random() * 4), // first pit between lap 7-10
        lastSectors: ["", "", "", "", ""],
        sectorProgress: 0,
        pendingSectors: ["", "", "", "", ""],
        pendingSectorSeconds: [0, 0, 0, 0, 0],
        pendingLapTime: 0,
        pendingIsPit: false,
        sectorEntryTime: 0,
        llts: "0",
        flts: "0",
      });
    }
  }

  function prepareNewLap(carIdx: number): void {
    const car = carStates[carIdx];
    const template = MOCK_CARS[carIdx];

    const isPitting = car.laps > 0 && car.laps === car.nextPitLap;

    // Base sector times from car's pace
    const baseSectors = SECTOR_RATIOS.map((r) => template.basePace * r);

    // Per-sector std deviation derived from car's variance
    // Divide by sqrt(5) to convert lap-level variance to per-sector
    const sectorStdDev = template.variance / template.basePace / 2.236;

    // Generate each sector with small gaussian deviation
    const sectorTimes = baseSectors.map((base) => {
      let t = base * (1 + gaussianRandom(0, sectorStdDev));
      // 5% chance of traffic delay: +3-8s on a single sector
      if (Math.random() < 0.05) {
        t += 3 + Math.random() * 5;
      }
      // Clamp to not go below 95% of base (unrealistically fast)
      return Math.max(base * 0.95, t);
    });

    car.pendingSectorSeconds = sectorTimes;
    car.pendingSectors = sectorTimes.map((t) => formatSectorTime(t));

    // Lap time = natural sum of sectors + pit penalty if pitting
    let lapTimeSec = sectorTimes.reduce((a, b) => a + b, 0);
    if (isPitting) {
      lapTimeSec += 120 + Math.random() * 80;
    }

    car.pendingLapTime = lapTimeSec;
    car.pendingIsPit = isPitting;
    car.sectorProgress = 0;
    car.sectorEntryTime = Date.now();
  }

  function advanceSectors(carIdx: number): void {
    const car = carStates[carIdx];
    const now = Date.now();

    if (car.sectorProgress >= 5) {
      // Lap complete — finalize and start new lap
      finalizeLap(carIdx);
      prepareNewLap(carIdx);
      // Clear all sectors for new lap
      for (let s = 0; s < 5; s++) {
        car.lastSectors[s] = "";
      }
      return; // new lap just started, wait for first sector to elapse
    }

    // Check if enough real time has elapsed for current sector
    const currentSectorIdx = car.sectorProgress; // 0-4
    const sectorDurationMs =
      car.pendingSectorSeconds[currentSectorIdx] * 1000 * TIME_SCALE;
    const elapsed = now - car.sectorEntryTime;

    if (elapsed < sectorDurationMs) return; // still in this sector

    // Sector complete — advance
    car.sectorProgress++;
    car.sectorEntryTime = now;

    // Copy revealed sectors into lastSectors
    for (let s = 0; s < car.sectorProgress; s++) {
      car.lastSectors[s] = car.pendingSectors[s];
    }
    // Clear unrevealed sectors
    for (let s = car.sectorProgress; s < 5; s++) {
      car.lastSectors[s] = "";
    }
  }

  function finalizeLap(carIdx: number): void {
    const car = carStates[carIdx];
    const template = MOCK_CARS[carIdx];
    const isPitting = car.pendingIsPit;
    const lapTimeSec = car.pendingLapTime;

    if (isPitting) {
      const pitDuration = lapTimeSec - template.basePace;
      car.pitCount++;
      car.pitSumSeconds += Math.max(0, pitDuration);
      car.nextPitLap = car.laps + 1 + 7 + Math.floor(Math.random() * 4);
      car.currentDriverIndex =
        (car.currentDriverIndex + 1) % car.drivers.length;
      car.name = car.drivers[car.currentDriverIndex];
    }

    car.laps++;
    car.totalTime += lapTimeSec;
    car.lastLapTime = lapTimeSec;

    // Track best lap (only clean laps)
    if (!isPitting && lapTimeSec < car.bestLapTime) {
      car.bestLapTime = lapTimeSec;
    }

    // LLTS: personal best (1) or overall best (2)
    car.llts = "0";
    if (!isPitting) {
      const allBests = carStates
        .filter((c) => c.bestLapTime < Infinity)
        .map((c) => c.bestLapTime);
      const overallBest = Math.min(...allBests);
      if (lapTimeSec <= car.bestLapTime + 0.001) {
        car.llts = lapTimeSec <= overallBest ? "2" : "1";
      }
    }

    // Keep all 5 sectors visible until new lap overwrites them
    for (let s = 0; s < 5; s++) {
      car.lastSectors[s] = car.pendingSectors[s];
    }
  }

  // Position based on completed sectors only (like real timing lines)
  function virtualProgress(car: CarState): number {
    return car.laps + car.sectorProgress / 5;
  }

  // Effective race time: sum of completed laps + completed sectors on current lap
  function effectiveRaceTime(car: CarState): number {
    let time = car.totalTime;
    for (let s = 0; s < car.sectorProgress; s++) {
      time += car.pendingSectorSeconds[s];
    }
    return time;
  }

  function buildRaceData(): RaceData {
    // Sort by virtual progress (laps + sector fraction) descending, then totalTime ascending
    const sorted = [...carStates].sort((a, b) => {
      const pa = virtualProgress(a);
      const pb = virtualProgress(b);
      if (Math.abs(pa - pb) > 0.001) return pb - pa;
      // Same sector progress: whoever crossed the last timing line first ranks higher
      return a.sectorEntryTime - b.sectorEntryTime;
    });

    // Determine class positions
    const classCounts: Record<string, number> = {};
    const classPositions: Map<string, number> = new Map();
    for (const car of sorted) {
      const cls = MOCK_CARS.find((c) => c.stnr === car.stnr)!.classname;
      classCounts[cls] = (classCounts[cls] || 0) + 1;
      classPositions.set(car.stnr, classCounts[cls]);
    }

    const leaderTime = effectiveRaceTime(sorted[0]);
    const leaderLaps = sorted[0]?.laps || 0;

    // Recalculate FLTS for all cars based on current overall best
    const allBests = carStates
      .filter((c) => c.bestLapTime < Infinity)
      .map((c) => c.bestLapTime);
    const overallBest = allBests.length > 0 ? Math.min(...allBests) : Infinity;
    for (const car of carStates) {
      if (car.bestLapTime >= Infinity) {
        car.flts = "0";
      } else if (car.bestLapTime <= overallBest) {
        car.flts = "2";
      } else {
        car.flts = "1";
      }
    }

    const result: Driver[] = sorted.map((car, idx) => {
      const template = MOCK_CARS.find((c) => c.stnr === car.stnr)!;
      const pos = idx + 1;
      const classRank = classPositions.get(car.stnr) || 1;

      // Gap calculation using effective race time (includes partial sectors)
      let gap = "";
      let interval = "";
      if (pos === 1) {
        gap = "";
        interval = "";
      } else if (car.sectorProgress === 0 && car.laps === 0) {
        // No sector completed yet — no meaningful gap
        gap = "";
        interval = "";
      } else {
        const gapSec = Math.max(0, effectiveRaceTime(car) - leaderTime);
        gap = formatLapTime(gapSec);
        const prevCarTime = effectiveRaceTime(sorted[idx - 1]);
        const intSec = Math.max(0, effectiveRaceTime(car) - prevCarTime);
        interval = formatLapTime(intSec);
      }

      return {
        POSITION: String(pos),
        RANK: String(pos),
        CLASSRANK: String(classRank),
        CHG: "0",
        STNR: car.stnr,
        ETA: "0",
        LAPS: String(car.laps + 1),
        NAME: car.name,
        CLASSNAME: template.classname,
        CAR: template.car,
        ISQUA: "0",
        GAP: gap,
        INT: interval,
        LASTLAPTIME: car.lastLapTime > 0 ? formatLapTime(car.lastLapTime) : "",
        LLTS: car.llts,
        FASTESTLAP:
          car.bestLapTime < Infinity ? formatLapTime(car.bestLapTime) : "",
        FLTS: car.flts,
        PITSTOPCOUNT: String(car.pitCount),
        PITSUM: String(car.pitSumSeconds).padStart(10, "0"),
        LASTINTERMEDIATENUMBER: String(car.sectorProgress * 2),
        LASTIMTIME: String(Date.now()),
        S1TIME: car.lastSectors[0],
        ST1T: "0",
        S1SPEED: String(180 + Math.random() * 60).slice(0, 5),
        ST1V: "0",
        S2TIME: car.lastSectors[1],
        ST2T: "0",
        S2SPEED: String(170 + Math.random() * 50).slice(0, 5),
        ST2V: "0",
        S3TIME: car.lastSectors[2],
        ST3T: "0",
        S3SPEED: String(180 + Math.random() * 40).slice(0, 5),
        ST3V: "0",
        S4TIME: car.lastSectors[3],
        ST4T: "0",
        S4SPEED: String(100 + Math.random() * 30).slice(0, 5),
        ST4V: "0",
        S5TIME: car.lastSectors[4],
        ST5T: "0",
        S5SPEED: String(160 + Math.random() * 50).slice(0, 5),
        ST5V: "0",
        TOPSPEED: String(230 + Math.random() * 30).slice(0, 5),
        TEAM: template.team,
        TPST: formatLapTime(car.pitSumSeconds),
        LLT: "0",
        LLC: "0",
        PRO: "PRO",
      };
    });

    return {
      PID: "0",
      RECNUM: "0",
      SND: "0",
      RCV: "0",
      VER: "2",
      EXPORTID: "20",
      HEATTYPE: "R",
      SESSION: "4600401101",
      NROFINTERMEDIATETIMES: "4",
      TRACKNAME: "Nürburgring",
      TRACKLENGTH: "24358",
      S1L: "2745",
      S2L: "3004",
      S3L: "6003",
      S4L: "9409",
      S5L: "3197",
      CUP: "NLS Mock Race",
      HEAT: "Rennen",
      TOD: String(Date.now()),
      STQ: "0",
      RESULT: result,
    };
  }

  function connect() {
    if (destroyed) return;
    connectionStatus.value = "connected";
    initCarStates();

    const now = Date.now();

    // Start fresh: all cars begin lap 1 with no prior times
    const maxGridGap = (carStates.length - 1) * 3;
    for (let i = 0; i < carStates.length; i++) {
      carStates[i].totalTime = i * 3; // stagger by 3s grid position
      prepareNewLap(i);
      // Stagger into S1 proportional to grid position: P1 is 30% through, last car just entered
      const fraction = maxGridGap > 0 ? (maxGridGap - i * 3) / maxGridGap : 0;
      const staggerMs =
        fraction *
        0.3 *
        carStates[i].pendingSectorSeconds[0] *
        1000 *
        TIME_SCALE;
      carStates[i].sectorEntryTime = now - staggerMs;
    }
    onMessage(buildRaceData());

    // Send events every 1s — sectors advance based on real elapsed time
    intervalId = setInterval(() => {
      if (destroyed) return;
      simLapPhase++;

      for (let i = 0; i < carStates.length; i++) {
        advanceSectors(i);
      }

      const data = buildRaceData();
      onMessage(data);
    }, 1000);
  }

  function destroy() {
    destroyed = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    connectionStatus.value = "disconnected";
  }

  return {
    connectionStatus: readonly(connectionStatus),
    connect,
    destroy,
  };
}
