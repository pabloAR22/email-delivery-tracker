# AGENTS.md — email-delivery-tracker

Guía para agentes de IA. `CLAUDE.md` importa este archivo.

## Qué es

Seguimiento de los correos de una app ficticia de notificaciones: enviados, entregados, rebotados y abiertos. Proyecto de portafolio (repo público), datos sintéticos.

## Stack

Node + Express 5 + TypeScript (`api/`), SES y SQS en el AWS Emulator oficial, MongoDB, dashboard React + TS + Vite (`web/`, pendiente), Docker, GitHub Actions.

## Emulación de AWS

- LocalStack Community exige cuenta y token: no usarlo.
- AWS Emulator: `AWS_ENDPOINT_URL=https://127.0.0.1:9297`, `NODE_EXTRA_CA_CERTS` apuntando a su `ca.pem`, telemetría apagada. Estado en memoria.
- Acepta SendEmail y SQS, pero no publica los eventos de SES (entregado, rebotado, abierto) a SNS/SQS: un simulador de eventos cubre el hueco y se retira cuando AWS lo arregle.

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
docker compose up -d      # MongoDB
cd api && npm ci && npm test && npm run lint
```
