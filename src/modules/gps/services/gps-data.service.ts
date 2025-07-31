import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GpsData } from '../entities/gps.entity';

@Injectable()
export class GpsDataService {
  constructor(
    @InjectRepository(GpsData)
    private readonly gpsDataRepository: Repository<GpsData>,
  ) {}

  // Mendapatkan semua data GPS
  async findAll(page = 1, limit = 10): Promise<{ data: GpsData[]; meta: any }> {
    const [data, total] = await this.gpsDataRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
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
  }

  // Mendapatkan data GPS terbaru berdasarkan IMEI (misalnya)
  async findLatestByImei(imei: string): Promise<GpsData | undefined> {
    return this.gpsDataRepository.findOne({
      where: { imei },
      order: { logTimestamp: 'DESC' },
    });
  }
}
