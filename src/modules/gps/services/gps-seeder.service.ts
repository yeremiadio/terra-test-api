import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import { GpsData } from '../entities/gps.entity';
import { GpsDataEntry } from '../interfaces/gps-data.interfaces';

@Injectable()
export class GpsDataSeederService {
  constructor(
    @InjectRepository(GpsData)
    private readonly gpsDataRepository: Repository<GpsData>,
  ) {}

  /**
   * Seed data from multiple JSON file paths
   * @param filePaths Array of full paths to JSON files
   */
  async seedFromFiles(filePaths: string[]) {
    for (const filePath of filePaths) {
      // Read JSON file content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData: Record<string, GpsDataEntry> = JSON.parse(fileContent);

      // Insert each record
      for (const [timestamp, entry] of Object.entries(jsonData)) {
        const entity = this.gpsDataRepository.create({
          imei: entry.imei,
          location: entry.location,
          lng: parseFloat(entry.lng),
          lat: parseFloat(entry.lat),
          date: new Date(entry.date),
          altitude: entry.altitude,
          speed: entry.speed,
          angle: entry.angle,
          status_mesin: entry.status_mesin,
          iodata: entry.iodata,
          logTimestamp: new Date(timestamp),
        });

        await this.gpsDataRepository.save(entity);
      }
    }
  }
}
