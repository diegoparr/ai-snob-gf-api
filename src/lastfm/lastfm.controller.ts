import { Controller, Get, Query } from '@nestjs/common';
import { LastfmService } from './lastfm.service';
import { GetTracksQueryDto } from './dto/get-tracks-query.dto';
import { GetTopArtistsQueryDto } from './dto/get-top-artists-query.dto';

@Controller('lastfm')
export class LastfmController {
  constructor(private readonly lastfmService: LastfmService) {}

  @Get('tracks')
  getTracks(@Query() query: GetTracksQueryDto) {
    return this.lastfmService.getTracks(query.limit);
  }

  @Get('top-artists')
  getTopArtists(@Query() query: GetTopArtistsQueryDto) {
    return this.lastfmService.getTopArtists(query.limit, query.period);
  }

  @Get('currently-playing')
  getCurrentlyPlaying() {
    return this.lastfmService.getCurrentlyPlayingTrack();
  }

  @Get('profile')
  getProfile() {
    return this.lastfmService.getMusicProfile();
  }

}
