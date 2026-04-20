import type { Ref } from "vue";

/** Raw driver entry from the WebSocket RESULT array */
export interface Driver {
  POSITION: string;
  RANK: string;
  CLASSRANK: string;
  CHG: string;
  STNR: string;
  ETA: string;
  LAPS: string;
  NAME: string;
  CLASSNAME: string;
  CAR: string;
  ISQUA: string;
  GAP: string;
  INT: string;
  LASTLAPTIME: string;
  LLTS: string;
  FASTESTLAP: string;
  FLTS: string;
  PITSTOPCOUNT: string;
  PITSUM: string;
  LASTINTERMEDIATENUMBER: string;
  LASTIMTIME: string;
  S1TIME: string;
  ST1T: string;
  S1SPEED: string;
  ST1V: string;
  S2TIME: string;
  ST2T: string;
  S2SPEED: string;
  ST2V: string;
  S3TIME: string;
  ST3T: string;
  S3SPEED: string;
  ST3V: string;
  S4TIME: string;
  ST4T: string;
  S4SPEED: string;
  ST4V: string;
  S5TIME: string;
  ST5T: string;
  S5SPEED: string;
  ST5V: string;
  S6TIME?: string;
  ST6T?: string;
  S6SPEED?: string;
  ST6V?: string;
  S7TIME?: string;
  ST7T?: string;
  S7SPEED?: string;
  ST7V?: string;
  S8TIME?: string;
  ST8T?: string;
  S8SPEED?: string;
  ST8V?: string;
  S9TIME?: string;
  ST9T?: string;
  S9SPEED?: string;
  ST9V?: string;
  TOPSPEED: string;
  TEAM: string;
  TPST: string;
  LLT: string;
  LLC: string;
  PRO?: string;
  [key: string]: unknown;
}

/** Internal driver object with flash/tracking fields */
export interface DriverInternal extends Driver {
  _flashClass: string | null;
  _positionDelta: number;
  _changeTimestamp: number;
  _prevLaps: string;
  _prevPitCount: string;
  _prevPitSum: string;
  _prevName: string;
  _prevSectors: string[];
  _sectorEntryTime: number;
}

/** WebSocket race data message */
export interface RaceData {
  PID: string;
  RECNUM?: string;
  SND?: string;
  RCV?: string;
  VER?: string;
  EXPORTID?: string;
  HEATTYPE?: string;
  SESSION?: string;
  NROFINTERMEDIATETIMES?: string;
  TRACKNAME?: string;
  TRACKLENGTH?: string;
  S1L?: string;
  S2L?: string;
  S3L?: string;
  S4L?: string;
  S5L?: string;
  S6L?: string;
  S7L?: string;
  S8L?: string;
  S9L?: string;
  APL?: string;
  BEST?: (string | number)[][];
  TRACKSTATE?: string;
  HEATNUMBER?: string;
  CUP?: string;
  HEAT?: string;
  TOD?: string;
  STQ?: string;
  RESULT?: Driver[];
  LEADING?: unknown;
  BESTLAPS?: unknown;
  eventPid?: number[];
}

/** Reactive race info extracted from the data */
export interface RaceInfo {
  trackName: string;
  cup: string;
  heat: string;
  session: string;
  trackLength: number;
  sectorCount: number;
  tod: number;
  raceStartTime: number;
}

/** A single recorded lap */
export interface LapRecord {
  lapNumber: number;
  lapTime: string;
  llts: string;
  sectors: string[];
  position: number;
  classPosition: number;
  timestamp: number;
  isPitIn: boolean;
  driverName: string;
}

/** A recorded pit stop */
export interface PitStop {
  pitNumber: number;
  atLap: number;
  estimatedDuration: number | null;
  totalPitTime: number;
  timestamp: number;
  driverOut: string;
}

/** A recorded driver change */
export interface DriverChange {
  fromDriver: string;
  toDriver: string;
  atLap: number;
  timestamp: number;
}

/** Accumulated history for a single car */
export interface CarHistory {
  laps: LapRecord[];
  pitStops: PitStop[];
  driverChanges: DriverChange[];
  drivers: string[];
}

/** Class color mapping */
export interface ClassColor {
  bg: string;
  text: string;
}

/** Connection status type */
export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

/** Data source interface returned by useWebSocket / useMockData */
export interface DataSource {
  connectionStatus: Readonly<Ref<ConnectionStatus>>;
  connect: () => void;
  destroy: () => void;
}

/** Detail panel tab type */
export type DetailTab = "laps" | "pits" | "drivers";
