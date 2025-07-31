import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class GpsData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  imei: string;

  @Column()
  location: string;

  @Column('float')
  lng: number;

  @Column('float')
  lat: number;

  @Column()
  date: Date;

  @Column()
  altitude: number;

  @Column()
  speed: number;

  @Column()
  angle: number;

  @Column()
  status_mesin: string;

  // Dynamic JSON column to handle iodata with arbitrary keys and values
  @Column('json')
  iodata: Record<string, number>;

  @Column({ type: 'timestamp' })
  logTimestamp: Date; // parsed from the root key like "2025-04-28 00:03:55"
}
