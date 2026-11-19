import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LastfmModule } from './lastfm/lastfm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LastfmModule,
  ],
})
export class AppModule {}
