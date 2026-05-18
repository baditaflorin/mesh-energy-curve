export const appConfig = {
  appName: "mesh-energy-curve",
  storagePrefix: "mesh-energy-curve",
  description:
    "Peer-to-peer meeting energy meter. Each phone runs a 0–100 slider; the rolling 10-minute average curve and min/max band are visible on every phone in the room.",
  accentHex: "#FFD24A",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-energy-curve",
  pagesUrl: "https://baditaflorin.github.io/mesh-energy-curve/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
