import { Module } from '@nestjs/common';
import { GpsController } from './controller';
import { GpsData } from './entities/gps.entity';
import { GpsDataSeederService, GpsDataService } from './services';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([GpsData])],
  controllers: [GpsController],
  providers: [GpsDataSeederService, GpsDataService],
  exports: [GpsDataSeederService, GpsDataService],
})
export class GpsModule {}
