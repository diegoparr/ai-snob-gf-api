import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LastfmController } from './lastfm.controller';
import { LastfmService } from './lastfm.service';

@Module({
  imports: [HttpModule],
  controllers: [LastfmController],
  providers: [LastfmService],
  exports: [LastfmService],
})
export class LastfmModule {}
