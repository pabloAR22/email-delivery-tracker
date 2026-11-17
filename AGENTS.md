# AGENTS.md — email-delivery-tracker

Guía para agentes de IA. `CLAUDE.md` importa este archivo.

## Qué es

Seguimiento de los correos de una app ficticia de notificaciones: enviados, entregados, rebotados y abiertos. Proyecto de portafolio (repo público), datos sintéticos.

## Stack

Node + Express 5 + TypeScript (`api/`), SES y SQS en el AWS Emulator oficial, MongoDB, dashboard React 19 + TS + Vite (`web/`, Vitest + Testing Library + MSW), Docker, GitHub Actions.

## Emulación de AWS

- LocalStack Community exige cuenta y token: no usarlo.
- AWS Emulator oficial: solo corre nativo en Linux, así que en macOS va en Docker (`emulator/Dockerfile`, servicio `aws` del compose). Sin imagen publicada: se construye instalando el RPM. Estado en memoria, un puerto = una región, cuenta `000000000000`.
- Al arrancar escribe `ca.pem`, `config` y `emulator_credentials` en `~/.aws/emulator/9297/` del host (el compose monta esa carpeta).
- Variables para Node: `AWS_ENDPOINT_URL=https://127.0.0.1:9297` (con `127.0.0.1`, no `localhost`), `AWS_SHARED_CREDENTIALS_FILE`, `AWS_CONFIG_FILE`, `NODE_EXTRA_CA_CERTS` (los tres bajo `~/.aws/emulator/9297/`), `AWS_EC2_METADATA_DISABLED=true`. Sin `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN`/`AWS_PROFILE` en el entorno.
- Clientes del SDK v3 con `disableHostPrefix: true`. El cliente SQS, además con `useQueueUrlAsEndpoint: false`: el emulador devuelve `QueueUrl` con el host real `sqs.us-east-1.amazonaws.com` y, sin esa opción, el SDK envía la llamada a AWS real.
- SES: `CreateEmailIdentity` verifica la identidad pero con un pequeño retraso; enviar justo después puede dar `MessageRejected` (identidad no verificada). Remitente y destinatario deben estar verificados.
- Acepta SendEmail y SQS, pero no publica los eventos de SES (entregado, rebotado, abierto) a SNS/SQS: un simulador de eventos cubre el hueco y se retira cuando AWS lo arregle.
- Telemetría apagada en la imagen (`--telemetry off`).

## Fases

| Fase | Qué | Estado |
|---|---|---|
| 1 | Esqueleto: API `/health`, CI, Docker Compose con Mongo | ✅ |
| 2 | `POST /emails`: envía por SES y guarda el mensaje en Mongo (`sent`) | ✅ |
| 3 | Simulador de eventos + consumidor SQS + estado por mensaje | ✅ |
| 4 | `GET /emails` con filtros + dashboard React | ✅ |
| 5 | Demo Vercel + MSW, README, publicaciones | ⬜ |

## Comandos

```
docker compose up -d      # MongoDB + AWS Emulator
cd api && npm ci && npm test && npm run lint     # MONGODB_URI=mongodb://localhost:27017/etd activa los tests con Mongo real
cd web && npm ci && npm test && npm run lint && npm run build
cd web && npm run dev     # proxy /emails -> localhost:3000 (API aparte, ver .env.example)
```

## Estructura de la API

`api/src/app.ts` (`createApp({ send, store })`, dependencias inyectadas para testear sin AWS ni Mongo) · `ses.ts` (envío, identidad del remitente, reintento por verificación tardía) · `store.ts` (Mongo, colección `messages`, `_id` = MessageId de SES) · `server.ts` (arranque). Los tests usan dobles en memoria, por eso el CI no necesita el emulador.

## Eventos y estados

`events.ts` (formato de eventos de SES, transiciones permitidas y simulador) · `sqs.ts` (cliente de la cola `email-events`) · `consumer.ts` (long polling; solo borra de la cola lo que se aplicó bien, si Mongo falla SQS reentrega). Estados: `sent` → `delivered` | `bounced`, y `delivered` → `opened`. SQS estándar no garantiza orden, así que `applyStatus` solo avanza si el estado actual lo permite.

Simulador (se retira cuando el emulador publique los eventos de SES): publica en la cola tras cada envío. Por destinatario: `bounce@…` rebota, `unopened@…` solo se entrega, cualquier otro se entrega y se abre.

Tests: `test/store.test.ts` usa MongoDB real y se salta sin `MONGODB_URI` (el CI la define con un servicio Mongo). El resto usa dobles en memoria.

## API de consulta y dashboard

`GET /emails?status=&to=&since=&until=&limit=` (limit 1–200, por defecto 50; solo query params string, otro formato → 400; `to` busca por subcadena sin distinguir mayúsculas y escapa la regex) y `GET /emails/stats` (conteos por estado). `store.list` normaliza `events` en documentos anteriores a la fase 3.

`web/src`: `api.ts` (tipos y fetch), `App.tsx` (tarjetas por estado que filtran, filtros con debounce de 300 ms, tabla, estados de carga/vacío/error con reintento, refresco cada 5 s), `mocks/` (datos sintéticos y handlers MSW: los usan los tests y los usará la demo). MSW 3: la opción es `onUnhandledFrame`, no `onUnhandledRequest`. Los tests esperan una fila de datos (`ana0@example.com`), no `findAllByRole('row')`, que se cumple con la cabecera.
