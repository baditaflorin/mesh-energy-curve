import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { CurveCanvas } from "./CurveCanvas";

const PUBLISH_INTERVAL_MS = 1000;
const HISTORY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const HISTORY_SAMPLE_MS = 1000; // one bucket per second
const HISTORY_LEN = Math.ceil(HISTORY_WINDOW_MS / HISTORY_SAMPLE_MS);
const DRAGGING_THRESHOLD = 40;
const RECOVERY_THRESHOLD = 50;
const DRAGGING_HOLD_MS = 2 * 60 * 1000;
const RECOVERY_HOLD_MS = 30 * 1000;

type Props = {
  roomId: string;
  initialEnergy: number;
  onEnergyChange: (value: number) => void;
};

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

type Sample = {
  avg: number;
  min: number;
  max: number;
  count: number;
};

type EnergyState = { value: number; ts: number };

export function Energy({ roomId, initialEnergy, onEnergyChange }: Props) {
  const [armed, setArmed] = useState(false);
  const [energy, setEnergy] = useState(initialEnergy);
  const [peerCount, setPeerCount] = useState(0);
  const [roomAvg, setRoomAvg] = useState<number | null>(null);
  const [roomMin, setRoomMin] = useState<number | null>(null);
  const [roomMax, setRoomMax] = useState<number | null>(null);
  const [history, setHistory] = useState<Sample[]>([]);
  const [dragging, setDragging] = useState(false);
  const [breakSuggested, setBreakSuggested] = useState(false);
  const [facilitator, setFacilitator] = useState(false);

  const energyRef = useRef(energy);
  energyRef.current = energy;

  const draggingSinceRef = useRef<number | null>(null);
  const recoverySinceRef = useRef<number | null>(null);

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const state = room.doc.getMap<{ breakSuggested: boolean }>("state");
    return { room, state };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return undefined;
    void maybeFetchTurnCredentials();
    return undefined;
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.room.provider?.destroy();
    };
  }, [mesh]);

  // Publish my energy via awareness
  useEffect(() => {
    if (!mesh?.room.provider) return undefined;
    const awareness = (mesh.room.provider as unknown as { awareness: Awareness }).awareness;
    const publish = () => {
      awareness.setLocalStateField("energy", {
        value: energyRef.current,
        ts: Date.now(),
      } satisfies EnergyState);
    };
    publish();
    const t = setInterval(publish, PUBLISH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [mesh]);

  // Sample aggregate from awareness every second, append to local rolling history
  useEffect(() => {
    if (!mesh?.room.provider) return undefined;
    const awareness = (mesh.room.provider as unknown as { awareness: Awareness }).awareness;

    const sample = () => {
      const states = awareness.getStates();
      const values: number[] = [];
      states.forEach((s) => {
        const e = s["energy"] as EnergyState | undefined;
        if (e && typeof e.value === "number" && Number.isFinite(e.value)) {
          values.push(Math.max(0, Math.min(100, e.value)));
        }
      });
      // Always include my own latest value in case awareness hasn't echoed back
      if (values.length === 0) values.push(energyRef.current);

      const count = values.length;
      const avg = values.reduce((a, b) => a + b, 0) / count;
      const min = Math.min(...values);
      const max = Math.max(...values);
      setPeerCount(count);
      setRoomAvg(avg);
      setRoomMin(min);
      setRoomMax(max);
      setHistory((prev) => {
        const next = [...prev, { avg, min, max, count }];
        if (next.length > HISTORY_LEN) next.splice(0, next.length - HISTORY_LEN);
        return next;
      });

      // Dragging detection (continuous threshold over time)
      const now = Date.now();
      if (avg < DRAGGING_THRESHOLD) {
        recoverySinceRef.current = null;
        if (draggingSinceRef.current === null) draggingSinceRef.current = now;
        if (now - draggingSinceRef.current >= DRAGGING_HOLD_MS) {
          setDragging(true);
        }
      } else {
        draggingSinceRef.current = null;
        if (avg >= RECOVERY_THRESHOLD) {
          if (recoverySinceRef.current === null) recoverySinceRef.current = now;
          if (now - recoverySinceRef.current >= RECOVERY_HOLD_MS) {
            setDragging(false);
          }
        } else {
          recoverySinceRef.current = null;
        }
      }
    };
    sample();
    const t = setInterval(sample, HISTORY_SAMPLE_MS);
    return () => clearInterval(t);
  }, [mesh]);

  // Observe shared state for break suggestion
  useEffect(() => {
    if (!mesh) return undefined;
    const onChange = () => {
      const entry = mesh.state.get("singleton");
      setBreakSuggested(Boolean(entry?.breakSuggested));
    };
    onChange();
    mesh.state.observe(onChange);
    return () => mesh.state.unobserve(onChange);
  }, [mesh]);

  const setEnergyClamped = (raw: number) => {
    const v = Math.max(0, Math.min(100, Math.round(raw)));
    setEnergy(v);
    onEnergyChange(v);
  };

  const broadcastBreak = (on: boolean) => {
    if (!mesh) return;
    mesh.room.doc.transact(() => {
      mesh.state.set("singleton", { breakSuggested: on });
    });
  };

  if (!armed) {
    return (
      <div className="energy-arm">
        <h1>mesh-energy-curve</h1>
        <p>
          A live meeting energy meter. Every phone in the room runs a 0–100 slider and sees the
          rolling 10-minute average curve. When the room drags, the screen will say so.
        </p>
        <button type="button" className="energy-arm-button" onClick={() => setArmed(true)}>
          Connect
        </button>
        <p className="energy-hint">
          Room <code>{roomId}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="energy-stage">
      <div className="energy-hud">
        <span>{peerCount} phones</span>
        <span>·</span>
        <span>avg {roomAvg !== null ? Math.round(roomAvg) : "–"}</span>
      </div>

      <div className="energy-curve-wrap">
        <CurveCanvas history={history} windowLen={HISTORY_LEN} />
      </div>

      <div className="energy-slider-wrap">
        <div className="energy-slider-label">
          <span className="energy-slider-top">on fire</span>
          <span className="energy-slider-value">{energy}</span>
          <span className="energy-slider-bot">drained</span>
        </div>
        <div className="energy-slider-track">
          <input
            type="range"
            min={0}
            max={100}
            value={energy}
            onChange={(e) => setEnergyClamped(Number(e.target.value))}
            className="energy-slider"
            aria-label="Your energy"
          />
          {roomAvg !== null && (
            <div
              className="energy-avg-tick"
              style={{ bottom: `calc(${roomAvg}% - 1px)` }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      <div className="energy-facilitator">
        <label className="energy-fac-check">
          <input
            type="checkbox"
            checked={facilitator}
            onChange={(e) => setFacilitator(e.target.checked)}
          />
          <span>facilitator</span>
        </label>
        {facilitator && (
          <button
            type="button"
            className={`energy-break-btn ${breakSuggested ? "on" : ""}`}
            onClick={() => broadcastBreak(!breakSuggested)}
          >
            {breakSuggested ? "clear break suggestion" : "suggest break"}
          </button>
        )}
      </div>

      {dragging && <div className="energy-callout energy-callout-dragging">ROOM IS DRAGGING</div>}
      {breakSuggested && <div className="energy-callout energy-callout-break">SUGGEST A BREAK</div>}

      <div className="energy-range-readout">
        {roomMin !== null && roomMax !== null
          ? `band ${Math.round(roomMin)}–${Math.round(roomMax)}`
          : "waiting for peers"}
      </div>
    </div>
  );
}
