import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GetRecentTracksResponse } from '../interfaces/lastfm-get-recent-track-response.interface';
import { GetTopArtistsResponse } from '../interfaces/lastfm-get-top-artists-response.interface-';

@Injectable()
export class LastfmService {
  private readonly logger = new Logger(LastfmService.name);
  private readonly baseUrl = 'https://ws.audioscrobbler.com/2.0/';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getCredentials(): { apiKey: string; username: string } {
    const apiKey = this.configService.get<string>('LASTFM_API_KEY');
    const username = this.configService.get<string>('LASTFM_USER');

    if (!apiKey || !username) {
      throw new InternalServerErrorException(
        'La configuración de Last.fm está incompleta',
      );
    }

    return { apiKey, username };
  }

  async getTracks(limit = 50): Promise<string[]> {
    const { apiKey, username } = this.getCredentials();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<GetRecentTracksResponse>(this.baseUrl, {
          params: {
            method: 'user.getrecenttracks',
            user: username,
            api_key: apiKey,
            format: 'json',
            limit,
          },
        }),
      );

      const tracks = Array.isArray(data.recenttracks.track)
        ? data.recenttracks.track
        : [data.recenttracks.track];

      return tracks.map((track) => `${track.name} - ${track.artist['#text']}`);
    } catch (error) {
      this.logger.error('Error fetching recent tracks', error);
      throw new InternalServerErrorException(
        'No fue posible obtener las canciones recientes de Last.fm',
      );
    }
  }



  async getTopArtists(limit = 50, period = 'overall'): Promise<string[]> {
    const { apiKey, username } = this.getCredentials();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<GetTopArtistsResponse>(this.baseUrl, {
          params: {
            method: 'user.gettopartists',
            user: username,
            api_key: apiKey,
            format: 'json',
            limit,
            period,
          },
        }),
      );
      return data.topartists.artist.map((artist) => artist.name);
    } catch (error) {
      this.logger.error('Error fetching top artists', error);
      throw new InternalServerErrorException(
        'No fue posible obtener los artistas más escuchados de Last.fm',
      );
    }
  }


  async getCurrentlyPlayingTrack(): Promise<string | null> {
    const { apiKey, username } = this.getCredentials();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<GetRecentTracksResponse>(this.baseUrl, {
          params: {
            method: 'user.getrecenttracks',
            user: username,
            api_key: apiKey,
            format: 'json',
            limit: 1,
          },
        }),
      );
      const rawTrack = data?.recenttracks?.track
      if(!rawTrack) return null

      const track = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack;

      if (track?.['@attr']?.nowplaying === 'true') {
        return `${track.name} - ${track.artist['#text']}`;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error fetching currently playing track', error);
      throw new InternalServerErrorException(
        'No fue posible obtener la canción que se está reproduciendo actualmente en Last.fm',
      );
    }
  }

  async getMusicProfile(): Promise<{
  artists: string[];
  tracks: string[];
  currentlyPlaying: string | null;
}> {
  const [artists, tracks, currentlyPlaying] = await Promise.all([
    this.getTopArtists(50, 'overall'),
    this.getTracks(50),
    this.getCurrentlyPlayingTrack(),
  ]);

  return {
    artists,
    tracks,
    currentlyPlaying,
  };
}

}