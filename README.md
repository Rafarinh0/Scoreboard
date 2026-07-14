# Live Scoreboard

A study project: a real-time sports scoreboard. It's for practicing queues,
WebSocket, persistence and an event-driven architecture in Node/TypeScript.

Match events (kickoff, goal, card, halftime, fulltime) are consumed from an API,
processed, and pushed to connected screens as they happen.

## How it works

```
mock-events-api   → narrates a match over time (the event source)
      │  HTTP polling with a cursor
poller            → consumes, validates and enqueues
      │
queue (BullMQ/Redis) → decouples ingestion from processing
      │
worker            → writes to Mongo and updates the match state
      │
WebSocket gateway → pushes the score to whoever is watching
      │
client (HTML)     → the screen updates on its own
```

## Stack

- **NestJS / TypeScript** — backend
- **Express** — the API that simulates the event source
- **BullMQ + Redis** — queue between ingestion and processing
- **MongoDB (Mongoose)** — event history
- **socket.io** — WebSocket for real time
- **Docker Compose** — brings everything up together

## Running

Requires Docker.

```bash
docker compose up --build
```

Then open `client/index.html` in a browser, leave the match at `42` and click
**Assistir**. A match lasts ~90s: kickoff, goals, halftime and fulltime, with the
score changing live.

```bash
docker compose down -v   # stop everything and wipe Mongo (to rewatch from scratch)
```

To rewatch the same match, run `down -v` before starting again — otherwise the
events are already in Mongo and the score shows 0-0.

## Structure

```
backend/            # NestJS
  src/
    ingestion/      # poller + event source (EventSource interface) + validation
    processing/     # worker that consumes the queue
    scoreboard/     # match state + WebSocket gateway
    persistence/    # Mongo schema and repository
mock-events-api/    # simulates the event source (Express)
client/             # the screen (HTML + socket.io)
docker-compose.yml
```

## Notes

Some simplifications, since this is a study project:

- Match state (score, phase, minute) is kept in memory and is lost on restart.
- It runs as a single instance; scaling the WebSocket would need Redis Pub/Sub
  between instances.
- The match clock runs on the client, assuming the same speed as the mock.

Not implemented (ideas for later): a ranking with a Redis sorted set, multiple
instances with Pub/Sub, a webhook as an alternative source, rate limiting,
consuming a real sports API.
