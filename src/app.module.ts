import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GpsModule } from './modules/gps';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // agar ConfigModule bisa digunakan di seluruh module tanpa import ulang
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        ssl: configService.get<boolean>('DB_SSL'),
        entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '../migrations/*{.ts,.js}'],
        synchronize:
          configService.get<string>('ENV') === 'production' ? true : false, // untuk development saja
      }),
      inject: [ConfigService],
    }),
    GpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
