import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { GpsData } from '../entities/gps.entity';
import {
  Iodata,
  MetricsSummary,
  MovementStats,
  ValueWithUnit,
} from '../interfaces/gps-data.interfaces';
import { keyMap, unitMap } from '../utils';

@Injectable()
export class GpsDataService {
  constructor(
    @InjectRepository(GpsData)
    private readonly gpsDataRepository: Repository<GpsData>,
  ) {}

  // Mendapatkan semua data GPS
  async findAll(
    page = 1,
    limit = 10,
    imei = '',
    startDate?: Date,
    endDate?: Date,
    isPaginated: boolean = true,
  ): Promise<{ data: GpsData[]; meta: any }> {
    const whereConditions: any = {};

    if (imei) {
      whereConditions.imei = imei;
    }

    if (startDate && endDate) {
      whereConditions.logTimestamp = Between(startDate, endDate);
    } else if (startDate) {
      whereConditions.logTimestamp = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereConditions.logTimestamp = LessThanOrEqual(endDate);
    }

    if (isPaginated) {
      const [data, total] = await this.gpsDataRepository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        where: whereConditions,
        order: { logTimestamp: 'DESC' },
      });

      const meta = {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };

      return { data, meta };
    } else {
      const data = await this.gpsDataRepository.find({
        where: whereConditions,
        order: { logTimestamp: 'DESC' },
      });
      return { data, meta: {} };
    }
  }

  // Mendapatkan data GPS terbaru berdasarkan IMEI (misalnya)
  async findLatestByImei(imei: string): Promise<GpsData | undefined> {
    return await this.gpsDataRepository.findOne({
      where: { imei },
      order: { logTimestamp: 'DESC' },
    });
  }

  //List latest for all IMEIs
  async findLatestForAll(startDate?: Date, endDate?: Date): Promise<GpsData[]> {
    let query = `
      SELECT DISTINCT ON (imei) *
      FROM gps_data
    `;
    const params: any[] = [];
    if (startDate && endDate) {
      query += ` WHERE "logTimestamp" BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ` WHERE "logTimestamp" >= $1`;
      params.push(startDate);
    } else if (endDate) {
      query += ` WHERE "logTimestamp" <= $1`;
      params.push(endDate);
    }
    query += ` ORDER BY imei ASC, "logTimestamp" DESC`;

    const rawResult = await this.gpsDataRepository.query(query, params);
    return rawResult;
  }

  transformIodata(iodata: Iodata): Record<string, ValueWithUnit> {
    const result: Record<string, ValueWithUnit> = {};

    for (const key in iodata) {
      const value = Number(iodata[key]);
      if (keyMap[key]) {
        const unit = unitMap[key] || '';
        result[keyMap[key]] = { value, unit };
      }
    }

    return result;
  }

  async getAverageOdometerByImei(): Promise<
    { imei: string; avgOdometer: number }[]
  > {
    const result = await this.gpsDataRepository
      .createQueryBuilder('gps_data')
      .select('gps_data.imei', 'imei')
      .addSelect("AVG((gps_data.iodata->>'16')::float)", 'avgOdometer') // Assuming PostgreSQL JSONB syntax, cast to float
      .groupBy('gps_data.imei')
      .getRawMany();

    return result;
  }

  calculateBaseMetricsFromGpsData(trackingLogs: GpsData[]): MetricsSummary {
    if (!trackingLogs || trackingLogs.length < 2) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        minSpeed: 0,
        movementStats: {
          totalIdlingTime: 0,
          totalMovingTime: 0,
          totalStoppedTime: 0,
        },
      };
    }

    let totalDistance = 0; // km
    let totalDuration = 0; // seconds
    let maxSpeed = -Infinity;
    let minSpeed = Infinity;

    for (let i = 1; i < trackingLogs.length; i++) {
      const prev = trackingLogs[i - 1];
      const curr = trackingLogs[i];

      // Convert coordinates from string to number
      const prevLat = prev.lat;
      const prevLng = prev.lng;
      const currLat = curr.lat;
      const currLng = curr.lng;

      // Distance between two points
      const dist = this.getDistanceFromLatLonInKm(
        prevLat,
        prevLng,
        currLat,
        currLng,
      );
      totalDistance += dist;

      // Duration between timestamps (parsed to Date)
      const prevTimestamp = new Date(prev.logTimestamp).getTime();
      const currTimestamp = new Date(curr.logTimestamp).getTime();
      const duration = (currTimestamp - prevTimestamp) / 1000; // seconds
      totalDuration += duration;

      // Check max and min speed
      const speed = curr.speed;
      if (speed > maxSpeed) maxSpeed = speed;
      if (speed < minSpeed) minSpeed = speed;
    }

    const movementStats = this.calculateMovementStats(trackingLogs);
    const averageSpeed =
      totalDuration > 0 ? totalDistance / (totalDuration / 3600) : 0;

    return {
      totalDistance,
      totalDuration,
      averageSpeed,
      maxSpeed: maxSpeed === -Infinity ? 0 : maxSpeed,
      minSpeed: minSpeed === Infinity ? 0 : minSpeed,
      movementStats: movementStats,
    };
  }

  // Haversine formula to calculate distance between two lat/lng points in km
  private getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateMovementStats(data: GpsData[]): MovementStats {
    let totalMovingTimeMs = 0;
    let totalStoppedTimeMs = 0;
    let totalIdlingTimeMs = 0;

    let movingStart: number | null = null;
    let stoppedStart: number | null = null;
    let idlingStart: number | null = null;

    for (const entry of data) {
      const speed = entry.speed;
      const ignition = entry.iodata['239']; // 1 = on, 0 = off
      const movementOn = entry.iodata['240'];
      const engineOn = entry.status_mesin === 'ON' && !!ignition;

      const movingThreshold = 1; // km/h
      const idlingThreshold = 1; // km/h, untuk membedakan idling dan moving

      const isMoving = !!movementOn && engineOn && speed > movingThreshold;
      const isIdling = engineOn && speed <= idlingThreshold;
      const isStopped = !engineOn && speed === 0;

      const timestampMs = new Date(entry.logTimestamp).getTime();

      // Moving time logic
      if (isMoving) {
        if (movingStart === null) {
          movingStart = timestampMs;
        }
      } else {
        if (movingStart !== null) {
          totalMovingTimeMs += timestampMs - movingStart;
          movingStart = null;
        }
      }

      // Idling time logic
      if (isIdling) {
        if (idlingStart === null) {
          idlingStart = timestampMs;
        }
      } else {
        if (idlingStart !== null) {
          totalIdlingTimeMs += timestampMs - idlingStart;
          idlingStart = null;
        }
      }

      // Stopped time logic
      if (isStopped) {
        if (stoppedStart === null) {
          stoppedStart = timestampMs;
        }
      } else {
        if (stoppedStart !== null) {
          totalStoppedTimeMs += timestampMs - stoppedStart;
          stoppedStart = null;
        }
      }
    }

    // Handle ongoing states at the end of data
    const lastTimestampMs =
      data.length > 0
        ? new Date(data[data.length - 1].logTimestamp).getTime()
        : 0;

    if (movingStart !== null)
      totalMovingTimeMs += lastTimestampMs - movingStart;
    if (idlingStart !== null)
      totalIdlingTimeMs += lastTimestampMs - idlingStart;
    if (stoppedStart !== null)
      totalStoppedTimeMs += lastTimestampMs - stoppedStart;

    return {
      totalMovingTime: totalMovingTimeMs / 1000, // dalam detik
      totalStoppedTime: totalStoppedTimeMs / 1000,
      totalIdlingTime: totalIdlingTimeMs / 1000,
    };
  }

  async getGnssStatusCounts(imei: string) {
    const data = await this.gpsDataRepository.find({ where: { imei } });
    const statusCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    data.forEach(({ iodata }) => {
      const gnss_status = iodata['69'];
      if (statusCounts.hasOwnProperty(gnss_status)) {
        statusCounts[gnss_status]++;
      }
    });
    return statusCounts;
  }

  async calculateDashboardMetrics(
    imei?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const whereConditions: any = {};
    if (imei) {
      whereConditions.imei = imei;
    }
    if (startDate && endDate) {
      whereConditions.logTimestamp = Between(startDate, endDate);
    } else if (startDate) {
      whereConditions.logTimestamp = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereConditions.logTimestamp = LessThanOrEqual(endDate);
    }
    const data = await this.gpsDataRepository.find({
      where: whereConditions,
    });
    const baseMetrics = this.calculateBaseMetricsFromGpsData(data);
    let totalOdometerSum = 0;
    let batteryVoltageSum = 0;
    let batteryVoltageCount = 0;
    const gsmSignalLevels: Record<number, number> = {};
    let gnssFixGoodCount = 0;
    let gnssFixBadCount = 0;

    for (const record of data) {
      const iodata = this.transformIodata(record.iodata);

      if (iodata.totalOdometer) {
        totalOdometerSum += iodata.totalOdometer.value;
      }

      if (iodata.batteryVoltage) {
        batteryVoltageSum += iodata.batteryVoltage.value;
        batteryVoltageCount++;
      }

      if (iodata.gsmSignal) {
        const signal = iodata.gsmSignal.value;
        gsmSignalLevels[signal] = (gsmSignalLevels[signal] || 0) + 1;
      }

      if (iodata.gnssStatus !== undefined) {
        const gnssStatusValue =
          typeof iodata.gnssStatus === 'object' &&
          iodata.gnssStatus !== null &&
          'value' in iodata.gnssStatus
            ? iodata.gnssStatus.value
            : iodata.gnssStatus;
        if (gnssStatusValue === 1) {
          gnssFixGoodCount++;
        } else {
          gnssFixBadCount++;
        }
      }
    }

    const batteryVoltageAvg = batteryVoltageCount
      ? batteryVoltageSum / batteryVoltageCount
      : 0;

    return {
      totalOdometerSum: { value: totalOdometerSum, unit: 'm' },
      averageBatteryVoltage: { value: batteryVoltageAvg, unit: 'V' },
      gsmSignalDistribution: gsmSignalLevels,
      gnssFix: {
        good: gnssFixGoodCount,
        bad: gnssFixBadCount,
      },
      baseMetrics,
      totalRecordsProcessed: data.length,
    };
  }

  async getIodataTrends(
    imei: string,
    startDate: string,
    endDate: string,
    iodataKey: string,
  ): Promise<{ labels: string[]; values: any[] }> {
    const data: GpsData[] = await this.gpsDataRepository.find({
      where: {
        imei,
        logTimestamp:
          startDate && endDate
            ? Between(new Date(startDate), new Date(endDate))
            : undefined,
      },
      select: ['imei', 'iodata', 'logTimestamp'],
      order: { logTimestamp: 'ASC' },
    });

    const labels = data.map((d) => d.logTimestamp.toISOString());
    const values = data.map((d) => d.iodata[iodataKey]); // Menggunakan key dari parameter

    return { labels, values };
  }

  async getCoordinatesByImei(
    imei: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    {
      id: number;
      lat: number;
      lng: number;
      location: string;
      timestamp: Date;
    }[]
  > {
    const whereConditions: any = { imei };
    if (startDate && endDate) {
      whereConditions.logTimestamp = Between(startDate, endDate);
    } else if (startDate) {
      whereConditions.logTimestamp = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereConditions.logTimestamp = LessThanOrEqual(endDate);
    }

    const records = await this.gpsDataRepository.find({
      where: whereConditions,
      order: { logTimestamp: 'ASC' },
      select: ['id', 'lat', 'lng', 'location', 'logTimestamp'],
    });

    return records.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      location: r.location,
      timestamp: r.logTimestamp,
    }));
  }
}
