# Privacy threat model — mesh-energy-curve

## What other peers in the same room can see

- Your current energy slider value (0–100) and the wall-clock timestamp at which you last published it. This is published every second into Yjs awareness while you're connected.
- Your Yjs awareness `clientID` — a per-session random integer that regenerates on every reload. Not tied to your identity in any way.
- Whether the "suggest break" overlay is currently on (a single shared boolean). Anyone in the room can toggle it; the broadcast doesn't identify who toggled.

That's the entire payload on the wire. No name, no location, no audio, no identity.

## What stays local

- Your room ID, your last slider value, and any signaling/TURN overrides are in `localStorage` on your device. They never leave.
- The 10-minute rolling curve drawn on your screen is reconstructed locally from awareness ticks. It exists nowhere else.

## What the signaling server sees

`signaling-server` (mine, source at https://github.com/baditaflorin/signaling-server) sees:

- The room name (`mesh-energy-curve:<roomId>`).
- Encrypted SDP offer/answer blobs being relayed between peers.
- The IP address of the peer making the WebSocket connection.

It does **not** see slider values or the break flag — those flow peer-to-peer over WebRTC DataChannel once the SDP exchange completes.

## What the TURN server sees

`coturn-hetzner` (mine, source at https://github.com/baditaflorin/coturn-hetzner) relays encrypted WebRTC data when peers cannot connect directly. It sees:

- The IP addresses of the two peers being relayed.
- Encrypted DTLS-SRTP bytes. It cannot decrypt them.

## Permissions asked

None. No mic, no camera, no motion sensor, no notifications. Just a slider and a network connection.

## Notable non-properties

- **No history retention across sessions.** When everyone disconnects, the room is gone. There is no log of "the team felt 32 / 100 last Tuesday at 3 PM." That's deliberate — see [ADR 0002](adr/0002-awareness-signal.md). If you need that, this is the wrong app.
- **No per-user attribution.** The displayed curve is the room average and band; there is no per-person breakdown in the UI. A peer with a packet sniffer can correlate awareness `clientID` with an IP address while watching that peer's slider move, but `clientID` is not stable across reloads.
- **No anonymity from a packet observer in the same room.** If you need true anonymity inside a public room, this is the wrong app — see `anon-conf-poll` for that pattern.
