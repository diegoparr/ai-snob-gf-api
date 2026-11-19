import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
export const LASTFM_TOP_ARTISTS_PERIODS = [
  'overall',
  '7day',
  '1month',
  '3month',
  '6month',
  '12month',
] as const;

export type LastfmTopArtistsPeriod =
  (typeof LASTFM_TOP_ARTISTS_PERIODS)[number];

export class GetTopArtistsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(200)
    limit = 50;

    @IsOptional()
    @IsIn(LASTFM_TOP_ARTISTS_PERIODS)
    period : LastfmTopArtistsPeriod = 'overall';
}