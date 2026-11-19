# Especificación técnica: Top Artistas de Last.fm

- **Feature ID:** `001-lastfm-top-artists`
- **Método upstream:** `user.gettopartists`
- **Endpoint propuesto:** `GET /lastfm/top-artists`
- **Estado:** Pendiente de revisión técnica

## 1. Objetivo y alcance

Exponer los artistas más escuchados del usuario configurado en `LASTFM_USER`, obtenidos desde Last.fm y transformados a un modelo de dominio limpio antes de salir de `LastfmService`.

La implementación debe reutilizar `HttpService`, `firstValueFrom`, `ConfigService` y la URL base ya presentes en `LastfmService`. No requiere persistencia, cambios en `SnobEvaluatorModule`, nuevas dependencias ni modificaciones en `LastfmModule`.

El nombre de usuario se obtiene exclusivamente de la configuración del servidor; no se acepta como query param en esta feature.

## 2. Contrato de entrada

### Request

```http
GET /lastfm/top-artists?limit=50&period=overall
```

### Query params

| Parametro | Obligatorio | Tipo recibido / transformado | Restricciones | Valor por defecto |
| --- | --- | --- | --- | --- |
| `limit` | No | `string` -> `number` mediante `@Type(() => Number)` | Entero entre `1` y `200` | `50` |
| `period` | No | `string` | Uno de `overall`, `7day`, `1month`, `3month`, `6month`, `12month` | `overall` |

Cualquier otro query param será eliminado por el `ValidationPipe` global (`whitelist: true`). Los valores inválidos serán rechazados con HTTP `400` antes de invocar el servicio.

### DTO propuesto

Archivo: `src/lastfm/dto/get-top-artists-query.dto.ts`.

```ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

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
  period: LastfmTopArtistsPeriod = 'overall';
}
```

## 3. Petición a Last.fm

`LastfmService` debe leer `LASTFM_API_KEY` y `LASTFM_USER` mediante `ConfigService` y ejecutar un `GET` contra `https://ws.audioscrobbler.com/2.0/`, envuelto en `firstValueFrom`, con estos parámetros:

| Parametro upstream | Valor |
| --- | --- |
| `method` | `user.gettopartists` |
| `user` | Valor de `LASTFM_USER` |
| `api_key` | Valor de `LASTFM_API_KEY` |
| `format` | `json` |
| `limit` | `limit` validado por el DTO |
| `period` | `period` validado por el DTO |

La API key solo puede viajar en la petición upstream. No debe incluirse en respuestas, excepciones ni mensajes de log.

## 4. Tipado estricto de la respuesta raw

Archivo propuesto: `src/interfaces/lastfm-get-top-artists-response.interface.ts`.

Last.fm representa números y rangos como strings. Además, puede devolver errores de dominio en una respuesta HTTP exitosa, por lo que el contrato raw debe contemplar tanto el payload exitoso como el payload de error.

```ts
export interface LastfmGetTopArtistsRawResponse {
  topartists: LastfmTopArtistsRaw;
}

export interface LastfmTopArtistsRaw {
  artist: LastfmTopArtistRaw[] | LastfmTopArtistRaw;
  '@attr': LastfmTopArtistsAttrRaw;
}

export interface LastfmTopArtistsAttrRaw {
  user: string;
  totalPages: string;
  page: string;
  perPage: string;
  total: string;
}

export interface LastfmTopArtistRaw {
  name: string;
  playcount: string;
  mbid: string;
  url: string;
  streamable: string;
  image: LastfmArtistImageRaw[];
  '@attr': LastfmTopArtistAttrRaw;
}

export interface LastfmTopArtistAttrRaw {
  rank: string;
}

export interface LastfmArtistImageRaw {
  size: string;
  '#text': string;
}

export interface LastfmErrorRawResponse {
  error: number;
  message: string;
  links?: string[];
}

export type LastfmGetTopArtistsApiResponse =
  | LastfmGetTopArtistsRawResponse
  | LastfmErrorRawResponse;
```

No se utilizará `any`. El genérico de `HttpService.get` será `LastfmGetTopArtistsApiResponse` y el discriminante `'error' in data` permitirá diferenciar ambos payloads.

## 5. Modelo de dominio y contrato de salida

Archivo propuesto: `src/interfaces/top-artists-response.interface.ts`.

```ts
export interface GetTopArtistsResponse {
  artists: TopArtist[];
  pagination: TopArtistsPagination;
}

export interface TopArtist {
  rank: number;
  name: string;
  mbid: string | null;
  url: string;
  playcount: number;
  images: TopArtistImage[];
}

export interface TopArtistImage {
  size: string;
  url: string;
}

export interface TopArtistsPagination {
  user: string;
  page: number;
  perPage: number;
  totalPages: number;
  total: number;
}
```

### Respuesta HTTP 200

```json
{
  "artists": [
    {
      "rank": 1,
      "name": "Artist name",
      "mbid": "artist-mbid",
      "url": "https://www.last.fm/music/Artist+name",
      "playcount": 123,
      "images": [
        {
          "size": "small",
          "url": "https://lastfm.freetls.fastly.net/image.png"
        }
      ]
    }
  ],
  "pagination": {
    "user": "configured-user",
    "page": 1,
    "perPage": 50,
    "totalPages": 4,
    "total": 173
  }
}
```

### Reglas de transformación

1. Normalizar `topartists.artist` a array aunque Last.fm devuelva un único objeto; una colección vacía produce `artists: []`.
2. Convertir `playcount`, `rank`, `page`, `perPage`, `totalPages` y `total` de `string` a `number`.
3. Rechazar como payload upstream inválido cualquier conversión que produzca un número no finito; no devolver `NaN` en la respuesta.
4. Convertir un `mbid` vacío o compuesto solo por espacios a `null`; conservar el valor original en los demás casos.
5. Mapear cada imagen de `{ size, '#text' }` a `{ size, url }`.
6. No exponer `streamable`, `@attr`, claves con `#text` ni otras estructuras raw en el modelo de dominio.
7. El método público del servicio será `getTopArtists(limit = 50, period: LastfmTopArtistsPeriod = 'overall'): Promise<GetTopArtistsResponse>`.
8. El endpoint del controlador declarará explícitamente `Promise<GetTopArtistsResponse>` y solo delegará en el servicio.

## 6. Mapeo de errores HTTP

| Situación | Excepción NestJS | HTTP | Mensaje público propuesto |
| --- | --- | --- | ---: | --- |
| `limit` o `period` inválido | `BadRequestException` generada por `ValidationPipe` | 400 | Detalle estándar de validación de class-validator |
| Falta `LASTFM_API_KEY` o `LASTFM_USER` | `InternalServerErrorException` | 500 | `LASTFM_API_KEY y LASTFM_USER deben estar configurados` |
| Last.fm informa `error: 6` (usuario no encontrado) | `NotFoundException` | 404 | `No fue posible encontrar el usuario de Last.fm` |
| Last.fm devuelve cualquier otro payload de error | `BadGatewayException` | 502 | `Last.fm no pudo completar la solicitud de top artistas` |
| Axios recibe HTTP 404 upstream | `NotFoundException` | 404 | `No fue posible encontrar el recurso de Last.fm` |
| Timeout, error de red u otro estado HTTP upstream | `BadGatewayException` | 502 | `No fue posible obtener los top artistas de Last.fm` |
| Payload exitoso incompleto o con números inválidos | `BadGatewayException` | 502 | `Last.fm devolvió una respuesta inválida de top artistas` |
| Fallo interno no clasificado | `InternalServerErrorException` | 500 | `No fue posible procesar los top artistas de Last.fm` |

Los errores upstream pueden registrarse internamente sin API keys ni stacks en la respuesta HTTP. Una excepción NestJS ya clasificada no debe envolverse nuevamente y perder su status.

## 7. Criterios de aceptación

- `GET /lastfm/top-artists` usa `user.gettopartists` con el usuario y la API key configurados.
- `limit` y `period` se validan mediante DTO antes de llamar a Last.fm.
- El servicio devuelve únicamente `GetTopArtistsResponse`, nunca el payload raw.
- Todos los métodos públicos nuevos tienen tipo de retorno explícito.
- No se introducen tipos `any`, accesos directos a `process.env`, llamadas HTTP en el controlador ni nuevas dependencias.
- Los errores se traducen a excepciones nativas de NestJS conforme a la tabla anterior.
- `LastfmModule` conserva su configuración actual y continúa exportando solo `LastfmService`.
- `npm run build` finaliza sin errores de TypeScript.
