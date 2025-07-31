import { GpsData } from '../entities/gps.entity';
import { BaseResponse } from './base-response.dto';

export class GpsDataResponse extends BaseResponse<GpsData[]> {
  constructor(
    data: GpsData[],
    message = 'GPS data retrieved successfully',
    meta?: any,
  ) {
    super(message, data, meta);
  }
}
