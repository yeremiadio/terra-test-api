export interface Iodata {
  [key: string]: number;
}

export interface ValueWithUnit {
  value: number;
  unit: string;
}

export interface GpsDataEntry {
  imei: string;
  location: string;
  lng: string;
  lat: string;
  date: string;
  altitude: number;
  speed: number;
  angle: number;
  status_mesin: string;
  iodata: Iodata;
}

export interface MetricsSummary {
  totalDistance: number; // km
  totalDuration: number; // seconds
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  minSpeed: number; // km/h
  movementStats: MovementStats;
}

export interface MovementStats {
  totalMovingTime: number;
  totalStoppedTime: number;
  totalIdlingTime: number;
}
