# ⚽ Placar ao Vivo

> Um placar esportivo em tempo real construído como **projeto de estudo** — um domínio
> escolhido de propósito para exercitar os pontos fortes do Node: I/O assíncrono,
> comunicação em tempo real e arquitetura orientada a eventos.

Não é um produto; é um **laboratório de conceitos**. Cada peça foi adicionada para
aprender *o que ela resolve* e *por que existe*, com o trade-off explícito. A ideia é
poder olhar para o código e explicar cada decisão numa entrevista.

---

## 🎯 A ideia

Eventos de uma partida (início, gol, cartão, intervalo, fim) são **ingeridos**,
**processados** e **empurrados em tempo real** para todas as telas conectadas — no
instante em que acontecem, sem a tela precisar perguntar.

```
[ API de eventos ]        narra uma partida ao longo do tempo (fonte simulada ou real)
        │  polling HTTP com cursor
        ▼
[ Poller / Ingestão ]     consome, valida na borda e enfileira  (ingestão "magra")
        │
        ▼
[ Fila (BullMQ + Redis) ] desacopla ingestão de processamento; absorve picos
        │
        ▼
[ Worker ]                processa cada evento no seu ritmo
        │
   ┌────┴────┐
   ▼         ▼
[ MongoDB ] [ Estado ]    histórico (fonte da verdade) / placar+fase+minuto (derivado)
        │
        ▼
[ WebSocket Gateway ]     empurra o placar para quem assiste aquela partida
        │
        ▼
[ Cliente (HTML) ]        a tela atualiza sozinha, ao vivo
```

**Em uma frase:** o poller faz polling da API de eventos, valida e **enfileira** → o worker
processa, grava no Mongo e atualiza o estado → o gateway **empurra** via WebSocket → a tela
muda para todos os conectados.

---

## 🧩 Stack e o *porquê* de cada escolha

| Tecnologia | Papel no projeto | Por que |
|---|---|---|
| **TypeScript** | Todo o código | Tipagem estática; num sistema de tempo real, um `undefined` inesperado derruba conexões. `strict: true`. |
| **NestJS** | Framework do backend | Arquitetura próxima do Spring/.NET (DI, módulos, controllers/services), com suporte nativo a WebSocket e filas. |
| **Express** | `mock-events-api` | A fonte simulada é descartável; não precisa do peso do Nest. |
| **BullMQ** (sobre Redis) | Fila de eventos | Desacopla ingestão de processamento; retries e "processa 1x". |
| **Redis** | Backing store da fila | Em memória, baixíssima latência. *(Sorted set e Pub/Sub ficam para os stretches.)* |
| **MongoDB** (Mongoose) | Persistência | Schema flexível: eventos variam de forma (gol tem time/jogador; fase não). |
| **socket.io** | Tempo real | Conexão persistente; o servidor **empurra**, o cliente não faz polling. |
| **Docker Compose** | Orquestração | Sobe tudo com um comando e **documenta a arquitetura** como serviços que colaboram. |

---

## 💡 Conceitos exercitados (os *talking points*)

- **Ingestão magra** — o poller só faz `consumir → validar → enfileirar`. Nada de regra de
  negócio: isso mantém a entrada rápida e resiliente sob pico.
- **Fila vs. Pub/Sub** — a **fila** entrega cada trabalho a **um** consumidor (processa 1x);
  o **Pub/Sub** faz **broadcast** para **todos** (usado pelas rooms do WebSocket).
- **Fonte plugável** — a ingestão fala com uma interface `EventSource`; API simulada e API
  real são implementações trocáveis **por config**, sem refatorar o resto (*Strategy* + *Factory*).
- **Cursor** — o poller guarda o último `seq` visto e pede só o que é novo: nunca reprocessa,
  nunca perde.
- **Idempotência em 3 camadas** — cursor (não repuxar) + `jobId` na fila (não duplicar em voo)
  + índice único `(matchId, seq)` no Mongo (não gravar/contar duas vezes).
- **WebSocket vs. Polling** — a tela não pergunta "tem novidade?"; a conexão fica aberta e o
  servidor empurra na hora.
- **Estado autoritativo + relógio no cliente** — o servidor é orientado a evento; o relógio
  da partida corre no cliente e é **ressincronizado** a cada evento que chega.
- **Por que Node** — consumir o feed e manter milhares de conexões abertas é **esperar I/O**;
  o event loop não bloqueia. É o cenário onde Node supera stacks thread-por-request.

### Padrões de projeto que aparecem
`Strategy` (EventSource) · `Factory` (escolha da fonte por config) · `Adapter`
(fonte simulada → interface) · `Repository` (persistência) · `Producer–Consumer` (poller → fila
→ worker) · `Singleton` (providers do Nest) · `DTO` (validação na borda) · Injeção de Dependência
em tudo.

---

## 🗂️ Estrutura

```
backend/                       # o serviço principal (NestJS)
  src/
    main.ts                    # sobe o servidor HTTP + WebSocket
    app.module.ts              # conecta config, schedule, fila, mongo, módulos
    ingestion/                 # consome a API e enfileira
      event-source.ts          # interface FonteDeEventos (real | simulada)
      sources/                 # implementações da fonte
      poller.service.ts        # poller: cursor, valida, enfileira
      dto/event.dto.ts         # validação na borda (class-validator)
    processing/
      events.processor.ts      # @Processor — o worker
    scoreboard/
      scoreboard.service.ts    # estado: placar + fase + minuto
      scoreboard.gateway.ts    # @WebSocketGateway — push em tempo real
    persistence/
      schemas/event.schema.ts  # documento + índice único (idempotência)
      persistence.service.ts   # Repository (fala com o Mongo)
    queue.constants.ts         # contrato compartilhado (nome da fila + tipo do job)

mock-events-api/               # SIMULA a fonte de eventos (Express)
  src/matches/match.ts         # roteiro da partida (fases, gols, cartões) no tempo

client/index.html              # a tela: relógio, placar, fases e feed de lances

docker-compose.yml             # sobe backend + redis + mongo + mock-events-api
```

---

## 🚀 Como rodar

Pré-requisito: **Docker** (com Docker Desktop rodando).

```bash
docker compose up --build
```

Isso sobe os 4 serviços. Depois, abra **`client/index.html`** no navegador, deixe a partida
em `42` e clique em **Assistir**.

Em ~90 segundos você vê a partida acontecer: **início → gols (com time, jogador e minuto) →
intervalo → mais gols → fim**, com o relógio correndo e o placar terminando **3-2**.

```bash
docker compose down -v    # para tudo e zera o Mongo (para reassistir do zero)
docker compose logs -f backend   # acompanha o backend narrando pelos logs
```

> Para reassistir a mesma partida, use `down -v` antes de subir de novo — senão os eventos
> já estarão gravados no Mongo e o placar aparece 0-0 (ver *Limitações*).

---

## 🧪 O que dá para observar

- **Logs do backend** — cada fase e lance: `[KICKOFF]`, `[GOAL] 12' home — Silva → 1-0`,
  `[HALFTIME] (1-1)`, `[FULLTIME] — final score 3-2`.
- **Redis** — `docker exec scoreboard-redis-1 redis-cli keys "bull:events:*"` mostra a fila.
- **MongoDB** — `docker exec scoreboard-mongo-1 mongosh scoreboard --eval "db.events.find()"`
  mostra o histórico persistido (inclusive fases, sem `team`/`player`).

---

## ⚠️ Limitações (consciente — por ser projeto de estudo)

- **Estado em memória** — placar/fase vivem no processo; um restart os perde e, como os
  eventos já estão no Mongo, o worker os trata como duplicatas (não recalcula). O stretch com
  **Redis sorted set** resolveria (durável e ranqueável).
- **Uma instância** — o WebSocket é *stateful*; com 2+ instâncias, um gol na instância A não
  alcançaria os clientes da B. É o problema que o **Redis Pub/Sub + redis-adapter** resolvem.
- **Relógio acoplado** — o cliente assume a mesma velocidade da mock (1s/min). O servidor
  poderia enviar a taxa para desacoplar.
- **Broadcast redundante** — todo evento processado dispara um push, mesmo quando o placar
  não muda (ex.: cartão).

---

## 🌱 Próximos passos (stretches)

- [ ] Redis **sorted set** para tabela de classificação (`top N` instantâneo).
- [ ] Redis **Pub/Sub** + 2 instâncias (escala horizontal do WebSocket).
- [ ] **Webhook** `POST /matches/:id/event` como fonte alternativa que *empurra* eventos.
- [ ] **Rate limiting** na ingestão.
- [ ] Consumir uma **API esportiva real** trocando só a implementação de `EventSource`.
- [ ] Deploy na AWS.

---

*Projeto de portfólio — foco em backend, tempo real e system design.*
