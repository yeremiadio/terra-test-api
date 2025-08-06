import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { GpsDataService } from '../services';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GpsData } from '../entities/gps.entity';
import { BaseResponse } from '../dto';

@Controller('gps')
@ApiTags('GPS')
export class GpsController {
  constructor(private readonly gpsDataService: GpsDataService) {}
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
    name: 'startDate',
    required: false,
    description: 'Start Date',
    type: Date,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End Date',
    type: Date,
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isPaginated') isPaginated = 'true',
  ): Promise<BaseResponse<GpsData[]>> {
    const pageNumber = parseInt(page, 10);
    const limitNumber = Math.min(parseInt(limit, 10), 100); // batasi max 100
    const isPaginatedBool = isPaginated === 'true' ? true : false;
    const startDateParams = startDate ? new Date(startDate) : undefined;
    const endDateParams = endDate ? new Date(endDate) : undefined;
    const { data, meta } = await this.gpsDataService.findAll(
      pageNumber,
      limitNumber,
      imei,
      startDateParams,
      endDateParams,
      isPaginatedBool,
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

  // @Get('seed')
  // seedService() {
  //   return this.gpsSeederService.seedFromFiles([
  //     './data/353691845092989_2025_04_28.json',
  //     './data/353691845092989_2025_04_29.json',
  //     './data/353691846213659_2025_04_13.json',
  //     './data/353691846213659_2025_04_14.json',
  //   ]);
  // }
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start Date',
    type: Date,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End Date',
    type: Date,
  })
  @Get('latest-for-all')
  @ApiResponse({
    status: 200,
    description: 'List of latest GPS data for all IMEIs',
    type: BaseResponse,
  })
  async findLatestForAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BaseResponse<GpsData[]>> {
    const startDateParams = startDate ? new Date(startDate) : undefined;
    const endDateParams = endDate ? new Date(endDate) : undefined;
    const data = await this.gpsDataService.findLatestForAll(
      startDateParams,
      endDateParams,
    );
    return new BaseResponse<GpsData[]>(
      'List of latest GPS data for all IMEIs',
      data,
    );
  }

  @Get('metrics')
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start Date',
    type: Date,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End Date',
    type: Date,
  })
  @ApiQuery({
    name: 'imei',
    description: 'IMEI of the GPS device',
    type: String,
    required: false,
  })
  async getDashboardMetrics(
    @Query('imei') imei = '',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const startDateParams = startDate ? new Date(startDate) : undefined;
    const endDateParams = endDate ? new Date(endDate) : undefined;
    return this.gpsDataService.calculateDashboardMetrics(
      imei,
      startDateParams,
      endDateParams,
    );
  }
  @Get('coordinates/:imei')
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start Date',
    type: Date,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End Date',
    type: Date,
  })
  @ApiParam({
    name: 'imei',
    description: 'IMEI of the GPS device',
    type: String,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of GPS data with pagination',
    type: BaseResponse,
  })
  async getCoordinatesByImei(
    @Param('imei') imei = '',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const startDateParams = startDate ? new Date(startDate) : undefined;
    const endDateParams = endDate ? new Date(endDate) : undefined;
    const data = await this.gpsDataService.getCoordinatesByImei(
      imei,
      startDateParams,
      endDateParams,
    );
    return new BaseResponse<
      {
        id: number;
        lat: number;
        lng: number;
        location: string;
        timestamp: Date;
      }[]
    >('List coordinates by IMEI', data);
  }

  @Get('gnss-status/:imei')
  @ApiParam({
    name: 'imei',
    description: 'IMEI of the GPS device',
    type: String,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'GNSS Status',
    type: BaseResponse,
  })
  async getGnssStatus(@Param('imei') imei = '') {
    const data = await this.gpsDataService.getGnssStatusCounts(imei);
    return new BaseResponse('List GNSS Status by IMEI', data);
  }

  @Get('trends')
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start Date',
    type: Date,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End Date',
    type: Date,
  })
  @ApiQuery({
    name: 'imei',
    description: 'IMEI of the GPS device',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'iodataKey',
    description: 'Parameter IO Data',
    type: String,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'GPS Trends',
    type: BaseResponse,
  })
  async getTrends(
    @Query('imei') imei: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('iodataKey') iodataKey: string,
  ) {
    if (!imei || !iodataKey) {
      return {
        error:
          'imei, startDate, endDate, and iodataKey query params are required',
      };
    }
    const data = await this.gpsDataService.getIodataTrends(
      imei,
      startDate,
      endDate,
      iodataKey,
    );
    return new BaseResponse('Trend Data', data);
  }
}
