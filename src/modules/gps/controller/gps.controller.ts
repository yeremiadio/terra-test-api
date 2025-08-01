import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { GpsDataSeederService, GpsDataService } from '../services';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GpsData } from '../entities/gps.entity';
import { BaseResponse } from '../dto';

@Controller('gps')
@ApiTags('GPS')
export class GpsController {
  constructor(
    private readonly gpsSeederService: GpsDataSeederService,
    private readonly gpsDataService: GpsDataService,
  ) {}
  // Mendapatkan semua data GPS
  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    type: Number,
  })
  @ApiQuery({
    name: 'imei',
    required: false,
    description: 'Imei of the GPS Device',
    type: String,
  })
  @ApiQuery({
    name: 'isPaginated',
    required: false,
    description: 'Wheter to paginate the results',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'List of GPS data with pagination',
    type: BaseResponse,
  })
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('imei') imei = '',
    @Query('isPaginated') isPaginated,
  ): Promise<BaseResponse<GpsData[]>> {
    const pageNumber = parseInt(page, 10);
    const limitNumber = Math.min(parseInt(limit, 10), 100); // batasi max 100

    const { data, meta } = await this.gpsDataService.findAll(
      pageNumber,
      limitNumber,
      imei,
      isPaginated,
    );

    return new BaseResponse<GpsData[]>(
      'List of GPS data with pagination',
      data,
      meta,
    );
  }

  // Endpoint mendapatkan data GPS terbaru berdasarkan imei
  @Get('/latest/:imei')
  @ApiParam({
    name: 'imei',
    description: 'IMEI of the GPS device',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Latest GPS data for the given IMEI',
    type: BaseResponse,
  })
  @ApiResponse({ status: 404, description: 'Data not found' })
  async findLatest(
    @Param('imei') imei: string,
  ): Promise<BaseResponse<GpsData>> {
    const data = await this.gpsDataService.findLatestByImei(imei);
    if (!data) {
      throw new NotFoundException(`GpsData with IMEI ${imei} not found`);
    }
    return new BaseResponse<GpsData>(`Latest GPS data for IMEI ${imei}`, data);
  }

  @Get('seed')
  seedService() {
    return this.gpsSeederService.seedFromFiles([
      './data/353691845092989_2025_04_28.json',
      './data/353691845092989_2025_04_29.json',
      './data/353691846213659_2025_04_13.json',
      './data/353691846213659_2025_04_14.json',
    ]);
  }

  @Get('latest-for-all')
  @ApiResponse({
    status: 200,
    description: 'List of latest GPS data for all IMEIs',
    type: BaseResponse,
  })
  async findLatestForAll(): Promise<BaseResponse<GpsData[]>> {
    const data = await this.gpsDataService.findLatestForAll();
    return new BaseResponse<GpsData[]>(
      'List of latest GPS data for all IMEIs',
      data,
    );
  }

  @Get('metrics')
  @ApiQuery({
    name: 'imei',
    description: 'IMEI of the GPS device',
    type: String,
  })
  async getDashboardMetrics(@Query('imei') imei = '') {
    return this.gpsDataService.calculateDashboardMetrics(imei);
  }
}
