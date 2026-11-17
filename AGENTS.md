# AGENTS.md — email-delivery-tracker

Guía para agentes de IA. `CLAUDE.md` importa este archivo.

## Qué es

Seguimiento de los correos de una app ficticia de notificaciones: enviados, entregados, rebotados y abiertos. Proyecto de portafolio (repo público), datos sintéticos.

## Stack

Node + Express 5 + TypeScript (`api/`), SES y SQS en el AWS Emulator oficial, MongoDB, dashboard React + TS + Vite (`web/`, pendiente), Docker, GitHub Actions.

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
| 2 | API de envío (SES) + modelo de mensaje en Mongo | ⬜ |
| 3 | Simulador de eventos + consumidor SQS + estado por mensaje | ⬜ |
| 4 | Dashboard React con filtros | ⬜ |
| 5 | Demo Vercel + MSW, README, publicaciones | ⬜ |

## Comandos

```
docker compose up -d      # MongoDB + AWS Emulator
cd api && npm ci && npm test && npm run lint
```
