# mesh-energy-curve

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--energy--curve-FFD24A?style=flat-square)](https://baditaflorin.github.io/mesh-energy-curve/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-energy-curve?style=flat-square&color=8a7a4a)](https://github.com/baditaflorin/mesh-energy-curve/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-1a160a?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer meeting energy meter. Each phone runs a 0–100 slider; the rolling 10-minute average curve and min/max band are visible on every phone in the room.

**Live:** https://baditaflorin.github.io/mesh-energy-curve/

Open the page on every phone in a meeting, workshop, or classroom. Everyone moves their slider as they like — drained to on fire. The phones see one shared curve: how the room is feeling, right now, over the last ten minutes. When the average drops below 40 for two minutes, every screen says **ROOM IS DRAGGING** so you don't have to guess.

There's an optional facilitator toggle that lets any phone broadcast a "suggest break" overlay to the whole room — a tiny ambient nudge that doesn't require interrupting whoever is talking.

## How it works

- Each phone joins a shared Yjs room over y-webrtc through a self-hosted signaling server.
- Each peer publishes `{ energy: 0..100, ts }` into its Yjs awareness state every second.
- Every phone reads the awareness map and computes its own local rolling history of `(avg, min, max)` per second over the last 10 minutes.
- The "ROOM IS DRAGGING" callout fires when the average is below 40 continuously for ≥2 min; it clears when the average is ≥50 for ≥30 s. ([ADR 0003](docs/adr/0003-thresholds.md))
- The break suggestion is a single key in a `Y.Map` — toggling it is broadcast to every phone.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). The short version: peers in the same room see your slider value and a timestamp. No name, no location, no identity.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-energy-curve.git
cd mesh-energy-curve
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Awareness, not a Y.Array log](docs/adr/0002-awareness-signal.md)
- [0003 — Threshold copy and timing](docs/adr/0003-thresholds.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
