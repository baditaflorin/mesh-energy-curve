---
status: accepted
date: 2026-05-12
---

# 0002 — Awareness for the live signal, not a Y.Array log

## Context

Each peer publishes a single number — their current energy level, 0 to 100 — once per second. Other peers need to see the current room average and the min/max band, plus a rolling 10-minute history. The naive Yjs primitive for a sequence of events is `Y.Array`, but with 1 Hz × N peers × an unbounded session, that array grows forever and replicates fully on every join. We don't need history that's authoritative across the mesh; we only need a current snapshot.

## Decision

The live energy value is stored in **Yjs awareness state**, not in any Y CRDT. Each peer writes `{ energy: number, ts: number }` into its own awareness slot once per second. Awareness state has natural eviction — when a peer disconnects, its state disappears from every other peer's awareness map within a few seconds.

The rolling 10-minute curve drawn on each phone is **local-only history**, computed by sampling the awareness map every second and appending one `(avg, min, max, count)` bucket to a local ring buffer of length 600.

The only Y CRDT we use is a tiny `Y.Map<"singleton", { breakSuggested }>` for the facilitator's break overlay, which is genuinely shared state with explicit user intent — that one belongs in a CRDT.

## Consequences

- **Memory bounded.** Awareness state is per-peer-current, not accumulating. Local history is a fixed 600-entry array. No long-running session OOM.
- **Joiners don't get prior history.** A phone that connects mid-meeting sees the room's current values immediately, but its rolling curve only fills in from when it joined. We've judged this acceptable — the curve is impressionistic, not auditable.
- **Each phone's curve can differ.** Because each phone samples independently, two phones started 30 s apart will have slightly different curves. The current-second average matches across phones (because the awareness state matches); only the historical shape diverges by exactly the join-time gap.
- **No replay.** There's no way to look at last week's energy. That's also a privacy property — see ADR 0003.

## Alternatives considered

- **`Y.Array<{ peerId, value, ts }>` of all samples.** Rejected — unbounded growth, expensive replication on join, encourages exactly the surveillance use case we want to make impossible.
- **`Y.Map<peerId, latest>` for current values.** Considered. Would let joiners see the same current state via the CRDT instead of awareness. Rejected because awareness already does this with automatic disconnect eviction, whereas we'd have to write explicit peer-leave cleanup for the map (and Yjs doesn't expose a reliable disconnect hook).
- **One Y.Doc per minute, garbage-collect older minutes.** Rejected — too much machinery for a feature whose value lies in being impressionistic, not precise.
