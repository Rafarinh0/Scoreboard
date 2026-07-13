# Placar ao Vivo

Projeto de estudo: um placar esportivo em tempo real. Serve para praticar filas,
WebSocket, persistência e uma arquitetura orientada a eventos em Node/TypeScript.

Eventos de uma partida (início, gol, cartão, intervalo, fim) são consumidos de uma
API, processados e empurrados para as telas conectadas conforme acontecem.

## Como funciona

```
mock-events-api   → narra uma partida ao longo do tempo (fonte de eventos)
      │  polling HTTP com cursor
poller            → consome, valida e enfileira
      │
fila (BullMQ/Redis) → desacopla ingestão de processamento
      │
worker            → grava no Mongo e atualiza o estado da partida
      │
WebSocket gateway → empurra o placar para quem assiste
      │
client (HTML)     → a tela atualiza sozinha
```

## Stack

- **NestJS / TypeScript** — backend
- **Express** — a API que simula a fonte de eventos
- **BullMQ + Redis** — fila entre ingestão e processamento
- **MongoDB (Mongoose)** — histórico dos eventos
- **socket.io** — WebSocket para o tempo real
- **Docker Compose** — sobe tudo junto

## Rodando

Precisa de Docker.

```bash
docker compose up --build
```

Depois abra `client/index.html` no navegador, deixe a partida em `42` e clique em
**Assistir**. A partida dura ~90s: início, gols, intervalo e fim, com o placar
mudando ao vivo.

```bash
docker compose down -v   # para tudo e zera o Mongo (para reassistir do zero)
```

Para reassistir a mesma partida use `down -v` antes de subir de novo, senão os
eventos já estão no Mongo e o placar aparece 0-0.

## Estrutura

```
backend/            # NestJS
  src/
    ingestion/      # poller + fonte de eventos (interface EventSource) + validação
    processing/     # worker que consome a fila
    scoreboard/     # estado da partida + WebSocket gateway
    persistence/    # schema e repositório do Mongo
mock-events-api/    # simula a fonte de eventos (Express)
client/             # a tela (HTML + socket.io)
docker-compose.yml
```

## Notas

Algumas simplificações, por ser projeto de estudo:

- O estado da partida (placar, fase, minuto) fica em memória e se perde no restart.
- Roda em uma instância só; escalar o WebSocket exigiria Redis Pub/Sub entre elas.
- O relógio da partida corre no cliente, assumindo a mesma velocidade da mock.

Não implementado (ideias para depois): ranking com Redis sorted set, múltiplas
instâncias com Pub/Sub, webhook como fonte alternativa, rate limiting, consumir uma
API esportiva real.
