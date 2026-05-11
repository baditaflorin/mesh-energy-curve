---
status: accepted
date: 2026-05-12
---

# 0003 — "ROOM IS DRAGGING" copy and timing

## Context

The whole reason this app exists is to make a feeling visible — a room dragging is something that anyone in the meeting can sense for themselves, but nobody says out loud because they don't want to be the one to call it out. So the app says it for you. Getting the threshold wrong makes the feature worse than not having it: too eager and people learn to ignore the callout; too slow and the meeting is already lost before it fires.

## Decision

- Show **ROOM IS DRAGGING** when the room-average energy is `< 40` continuously for at least **2 minutes**. The clock resets the instant the average rises to 40 or above.
- Clear the callout when the room-average energy is `≥ 50` continuously for at least **30 seconds**. Asymmetric hysteresis: it's harder to get rid of the warning than to dodge it.
- Copy is exactly **"ROOM IS DRAGGING"**. No "consider a break," no "low energy detected," no apology — it's a one-fact observation. The break-suggestion overlay is a separate, opt-in mechanic with its own copy.
- All four numbers (40, 50, 2 min, 30 s) live as constants in `Energy.tsx` and are not user-tunable in v1.

## Consequences

- **Sustained low signal, not blip detection.** A 90-second cold start where the average drops to 25 doesn't fire the callout. That's deliberate — short dips during a heated debate or a tough realization aren't dragging.
- **Recovery is responsive.** Once the average crosses 50, the callout disappears in 30 seconds, so the screen doesn't lie when the room actually picks up.
- **Same on every phone.** Every phone computes the same average from the same awareness state, so the callout shows up on everyone's screen within the awareness-tick precision (~1 s).
- **Not user-tunable.** A facilitator who wants a different threshold for their team is not served. We'd rather ship one opinionated default than five sliders that nobody calibrates. If real users tell us the threshold is wrong, we'll change the constants, not add a setting.

## Alternatives considered

- **Single threshold (no hysteresis).** Rejected — the callout would flicker on/off around the boundary.
- **Aggregated 1-minute bins.** Rejected — adds latency for no real-world benefit. We're already smoothing across N peers; we don't need to also smooth across time.
- **Configurable threshold in Settings.** Rejected for v1. Adding settings is cheap; removing them once shipped is impossible.
- **Softer copy ("the room could use a break").** Rejected — softer copy reads as the app being polite, which makes it easier to ignore. "ROOM IS DRAGGING" is a flat statement of fact about an observable quantity, and reads that way.
