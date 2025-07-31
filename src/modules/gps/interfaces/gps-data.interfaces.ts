interface Iodata {
  [key: string]: number;
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
