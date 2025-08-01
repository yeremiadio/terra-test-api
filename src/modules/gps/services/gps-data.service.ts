import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GpsData } from '../entities/gps.entity';
import { Iodata, ValueWithUnit } from '../interfaces/gps-data.interfaces';
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
    isPaginated: boolean = true,
  ): Promise<{ data: GpsData[]; meta: any }> {
    if (!!isPaginated) {
      const [data, total] = await this.gpsDataRepository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        where: imei ? { imei } : {},
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
        where: imei ? { imei } : {},
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
  async findLatestForAll(): Promise<GpsData[]> {
    const rawResult = await this.gpsDataRepository.query(`
      SELECT DISTINCT ON (imei) *
      FROM gps_data
      ORDER BY imei ASC, "logTimestamp" DESC
    `);
    console.log(rawResult);
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

  async calculateDashboardMetrics(imei?: string): Promise<any> {
    const data = await this.gpsDataRepository.find({
      where: imei ? { imei } : {},
      order: { logTimestamp: 'DESC' },
    });
    // Use transformIodata logic from previous example
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
      totalRecordsProcessed: data.length,
    };
  }
}
