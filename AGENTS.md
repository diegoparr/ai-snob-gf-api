# AI Agent Governance & Architecture Guidelines (**AGENTS**.md)

## Project Overview & Mission

ai-snob-gf-api is a modular NestJS backend designed to evaluate user musical tastes. It consumes listening history from the Last.fm **API**, processes domain models, orchestrates **LLM** prompt pipelines via OpenRouter, and delivers structured critique dialogue back to the client/mod ecosystem.

## System Architecture & Component Boundaries

### 2.1 C4 Component Diagram

```mermaid
C4Component
    title Component Diagram - ai-snob-gf-api (NestJS Backend)

    Container(client, "Game Client / Mod", "Java / Fabric", "Sends player music queries and triggers taste evaluations.")
    System_Ext(lastfm_ext, "Last.fm API", "External REST API serving scrobbles, top tracks, and artist metrics.")
    System_Ext(openrouter_ext, "OpenRouter API", "External LLM Gateway (DeepSeek, GLM, Claude) for dialogue generation.")
    ContainerDb(db_ext, "PostgreSQL Database", "TypeORM / Relational Store", "Stores user audit trails, music profiles, and taste logs.")

    Container_Boundary(api_boundary, "ai-snob-gf-api (NestJS Application)") {

        Boundary(lastfm_mod, "LastfmModule") {
            Component(lastfm_ctrl, "LastfmController", "NestJS Controller", "Exposes REST endpoints (/lastfm/*) and binds validation pipes.")
            Component(lastfm_dto, "Lastfm DTOs", "class-validator", "Enforces input schema for limit, period, and user query params.")
            Component(lastfm_svc, "LastfmService", "NestJS Service", "Fetches music telemetry using HttpService and firstValueFrom.")
            Component(lastfm_model, "Domain & Raw Interfaces", "TypeScript Interfaces", "Provides strict typing for external Last.fm responses and domain models.")
        }

        Boundary(snob_mod, "SnobEvaluatorModule") {
            Component(snob_svc, "SnobEvaluatorService", "NestJS Service", "Orchestrates prompt construction and music critique logic.")
            Component(openrouter_svc, "OpenRouterService", "NestJS Service / HTTP Client", "Communicates with OpenRouter endpoints and handles LLM streaming/responses.")
        }

        Boundary(common_mod, "Common Core & Config") {
            Component(config_svc, "ConfigService", "@nestjs/config", "Loads and validates environment variables (API keys, ports).")
            Component(http_client, "HttpModule (Axios)", "@nestjs/axios", "Underlying HTTP client engine with interceptors and timeout policies.")
        }
    }

    Rel(client, lastfm_ctrl, "Requests telemetry / evaluation via", "JSON / HTTPS")
    Rel(lastfm_ctrl, lastfm_dto, "Validates incoming query with")
    Rel(lastfm_ctrl, lastfm_svc, "Delegates data retrieval to")
    Rel(lastfm_svc, lastfm_model, "Types and transforms responses using")
    Rel(lastfm_svc, http_client, "Executes HTTP requests through")
    Rel(http_client, lastfm_ext, "Calls user.gettopartists / user.getrecenttracks on", "HTTPS")

    Rel(snob_svc, lastfm_svc, "Queries aggregated music profile from")
    Rel(snob_svc, openrouter_svc, "Dispatches prompt payload to")
    Rel(openrouter_svc, http_client, "Executes inference request through")
    Rel(http_client, openrouter_ext, "Sends chat completion payload to", "HTTPS")

    Rel(lastfm_svc, config_svc, "Reads LASTFM_API_KEY and LASTFM_USER from")
    Rel(openrouter_svc, config_svc, "Reads OPENROUTER_API_KEY and model IDs from")
    Rel(snob_svc, db_ext, "Persists evaluations and audit metrics into", "TCP / TypeORM")
```

## Strict Coding Standards & Conventions

### 3.1 Architecture & Separation of Concerns

Controllers are Thin: Controllers (*.controller.ts) **MUST** **ONLY** handle request mapping, route params, validation pipes, and return **HTTP** responses. No business logic or direct **HTTP** fetching allowed.

Services Encapsulate Domain Logic: All network calls, caching, transformations, and error handling must live in *.service.ts.

Module Isolation: Modules **MUST** export only what other modules need. When injecting LastfmService into SnobEvaluatorModule, LastfmModule must explicitly declare exports: [LastfmService].

No Direct process.env Calls: Always inject and consume ConfigService from @nestjs/config.

### 3.2 TypeScript & Typing Integrity

Strict Typing (Zero any Policy):

The use of any is strictly prohibited.

Use explicit interfaces/types for external raw payloads (e.g., LastfmGetRecentTracksRawResponse).

Map raw payloads to clean domain entities before returning them from services.

Strict Return Types: All public methods in services and controllers must declare their return types explicitly (e.g., Promise<CleanTrack[]>).

### 3.3 **HTTP** & Asynchronous Handling

RxJS & @nestjs/axios: Always wrap this.httpService.get() or this.httpService.post() calls using firstValueFrom from rxjs.

Error Translation:

Catch upstream Axios errors and translate them into native NestJS exceptions (BadGatewayException, InternalServerErrorException, NotFoundException).

Do not leak raw Axios error stacks or sensitive **API** keys in **HTTP** error messages.

### 3.4 Data Validation & DTOs

**DTO** Enforcements: All query parameters, route params, and request bodies must have dedicated **DTO** classes under src/<module>/dto/.

Class Validator & Transformer:

Annotate fields using @IsString(), @IsOptional(), @IsInt(), @Min(), @Max(), etc.

Always apply @Type(() => Number) when receiving query params meant to be parsed as numbers.

## Agent Operational Roles (SDD Workflow)

### 4.1 Planner Agent (z-ai/glm-5.3 / moonshotai/kimi-k3)

Scope: Architectural planning, contract design, schema validation, and task breakdowns.

Permissions: Read-only access to existing code. Write access **ONLY** to .specs/features/<feature-id>/spec.md and plan.md.

Outputs:

spec.md: Detailed input/output contracts, endpoints, query schemas, and edge case specifications.

plan.md: Sequential, atomic checkboxes for code implementation.

### 4.2 Executor Agent (deepseek/deepseek-v4.1-flash-**1017**)

Scope: Implementation of atomic tasks defined in plan.md.

Permissions: Modify files under src/. Run build commands (npm run build).

Constraints:

Execute only one task from plan.md per run.

Do not introduce dependencies without explicit user consent.

Must verify TypeScript compilation passes after every edit.

## Definition of Done (DoD) Checklist

Before any feature or task is marked as complete:

[ ] DTOs are validated with class-validator and class-transformer.

[ ] No any types are introduced in interfaces or method signatures.

[ ] npm run build executes with zero TypeScript compiler errors.

[ ] Target module exports/imports are properly closed in their respective *.module.ts.