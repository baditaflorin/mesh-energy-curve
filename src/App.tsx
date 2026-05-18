import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { Energy } from "./features/energy/Energy";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  energy: `${appConfig.storagePrefix}:energy`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}
function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [energy, setEnergy] = useState(() => readNumber(STORAGE.energy, 70));

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.energy, String(energy));
  }, [energy]);

  return (
    <MeshShell config={appConfig} roomId={roomId} onRoomChange={setRoomId}>
      <Energy roomId={roomId} initialEnergy={energy} onEnergyChange={setEnergy} />
    </MeshShell>
  );
}
