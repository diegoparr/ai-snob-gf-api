# Plan de implementación: Top Artistas de Last.fm

- **Feature ID:** `001-lastfm-top-artists`
- **Especificación:** `.specs/features/001-lastfm-top-artists/spec.md`
- **Orden:** Secuencial; cada tarea depende de la anterior.
- **Restricción operativa:** el Executor debe completar una sola tarea por ejecución y verificar `npm run build` después de cada tarea que modifique código.

## Checklist atómico

### 1. Crear el DTO de consulta

- [ ] Crear `src/lastfm/dto/get-top-artists-query.dto.ts`.
- [ ] Declarar la constante y el tipo estricto para los periodos `overall`, `7day`, `1month`, `3month`, `6month` y `12month`.
- [ ] Añadir `GetTopArtistsQueryDto` con `limit = 50`, validado con `@IsOptional()`, `@Type(() => Number)`, `@IsInt()`, `@Min(1)` y `@Max(200)`.
- [ ] Añadir `period = 'overall'`, validado con `@IsOptional()` e `@IsIn(...)`.
- [ ] Ejecutar `npm run build` y dejar constancia del resultado antes de avanzar.

### 2. Crear las interfaces de la respuesta raw de Last.fm

- [ ] Crear `src/interfaces/lastfm-get-top-artists-response.interface.ts`.
- [ ] Declarar las interfaces del payload exitoso para `topartists`, artistas, imágenes, `@attr` y todos los valores numéricos raw como `string`.
- [ ] Tipar `artist` como array u objeto único para permitir su normalización posterior.
- [ ] Declarar `LastfmErrorRawResponse` y la unión `LastfmGetTopArtistsApiResponse` para contemplar errores devueltos por Last.fm con HTTP 200.
- [ ] Confirmar que no existe ningún tipo `any` en el archivo.
- [ ] Ejecutar `npm run build` y verificar compilación.

### 3. Crear el modelo de dominio limpio

- [ ] Crear `src/interfaces/top-artists-response.interface.ts`.
- [ ] Declarar `GetTopArtistsResponse`, `TopArtist`, `TopArtistImage` y `TopArtistsPagination` exactamente con los campos y tipos definidos en `spec.md`.
- [ ] Usar `number` para contadores y paginación, y `string | null` para `mbid`.
- [ ] Confirmar que el modelo no expone `@attr`, `#text`, `streamable` ni tipos `any`.
- [ ] Ejecutar `npm run build` y verificar compilación.

### 4. Implementar la obtención y transformación en `LastfmService`

- [ ] Importar en `src/lastfm/lastfm.service.ts` el DTO/tipo de periodo, las interfaces raw, el modelo de dominio y las excepciones NestJS necesarias.
- [ ] Añadir `getTopArtists(limit = 50, period: LastfmTopArtistsPeriod = 'overall'): Promise<GetTopArtistsResponse>` sin alterar el comportamiento de `getTracks`.
- [ ] Leer `LASTFM_API_KEY` y `LASTFM_USER` mediante `ConfigService`; lanzar `InternalServerErrorException` si falta alguno.
- [ ] Ejecutar `this.httpService.get<LastfmGetTopArtistsApiResponse>(...)` dentro de `firstValueFrom`, usando la URL base existente y los parámetros `method`, `user`, `api_key`, `format`, `limit` y `period` especificados.
- [ ] Detectar payloads de error mediante `'error' in data`; traducir `error: 6` a `NotFoundException` y los demás a `BadGatewayException` sin exponer el mensaje upstream.
- [ ] Normalizar el artista único/array y mapear el payload exitoso a `GetTopArtistsResponse`, incluyendo conversiones numéricas, `mbid` vacío a `null` e imágenes limpias.
- [ ] Validar que las conversiones numéricas sean finitas y tratar un payload incompleto o inválido como `BadGatewayException`.
- [ ] Traducir Axios HTTP 404 a `NotFoundException`; traducir timeout, red y demás errores upstream a `BadGatewayException`; conservar las excepciones NestJS ya clasificadas y usar `InternalServerErrorException` solo para fallos internos no clasificados.
- [ ] Mantener logs internos sin API keys y respuestas de error sin stacks ni datos sensibles.
- [ ] Ejecutar `npm run build` y verificar compilación.

### 5. Exponer el endpoint en `LastfmController`

- [ ] Importar `GetTopArtistsQueryDto` y `GetTopArtistsResponse` en `src/lastfm/lastfm.controller.ts`.
- [ ] Añadir `@Get('top-artists')` y el método `getTopArtists(@Query() query: GetTopArtistsQueryDto): Promise<GetTopArtistsResponse>`.
- [ ] Delegar exclusivamente con `return this.lastfmService.getTopArtists(query.limit, query.period)`.
- [ ] Confirmar que el controlador no contiene transformaciones, llamadas HTTP ni manejo de errores de dominio.
- [ ] Ejecutar `npm run build` y verificar compilación.

### 6. Verificación final de contrato y arquitectura

- [ ] Revisar que `LastfmModule` no requiera cambios y siga exportando únicamente `LastfmService`.
- [ ] Verificar estáticamente que no se añadieron tipos `any`, accesos directos a `process.env` ni dependencias nuevas.
- [ ] Ejecutar `npm run build` como comprobación final.
- [ ] Con credenciales válidas y sin publicar secretos, comprobar `GET /lastfm/top-artists`, un caso con `limit` y `period` válidos, y la respuesta limpia con `artists` y `pagination`.
- [ ] Comprobar que `limit=0`, `limit=201`, `limit=abc` y `period=invalid` responden HTTP 400 sin llamada upstream.
- [ ] Comprobar, mediante dobles locales si están disponibles o revisión de los caminos de error, los mapeos 404, 500 y 502 definidos en `spec.md`; no añadir un framework de pruebas ni dependencias para esta verificación sin autorización.
- [ ] Marcar la feature como completada solo cuando todos los criterios de aceptación y el checklist DoD estén satisfechos.

## Definition of Done

- [ ] DTO validado con class-validator y class-transformer.
- [ ] Respuesta raw y modelo de dominio estrictamente tipados, sin `any`.
- [ ] Servicio usa `HttpService`, `firstValueFrom` y `ConfigService`.
- [ ] Controlador delgado y métodos públicos con retorno explícito.
- [ ] Excepciones nativas de NestJS aplicadas sin exponer secretos.
- [ ] Módulo con imports/exports cerrados y sin cambios innecesarios.
- [ ] `npm run build` ejecuta con cero errores de TypeScript.
