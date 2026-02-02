"use client";

import { useEffect, useState } from "react";
import { useActiveRaffle } from "@/hooks/useActiveRaffle";
import type { RaffleSession } from "@/lib/types";

interface DisplayRaffleProps {
  roomId: string;
}

export default function DisplayRaffle({ roomId }: DisplayRaffleProps) {
  const { session } = useActiveRaffle(roomId);
  const [slots, setSlots] = useState<string[]>(["?", "?", "?"]);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (session.status === "waiting") {
      setSlots(["?", "?", "?"]);
      setSpinning(false);
      return;
    }
    if (session.status === "spinning" && !spinning) {
      setSpinning(true);
      // 슬롯 애니메이션: 랜덤 값들로 빠르게 돌리다가 멈춤은 Admin이 "당첨자 결정" 누르면 session.result로 표시
      const interval = setInterval(() => {
        if (session.mode === "number_range") {
          const min = session.config?.min ?? 1;
          const max = session.config?.max ?? 100;
          setSlots([
            String(Math.floor(Math.random() * (max - min + 1)) + min),
            String(Math.floor(Math.random() * (max - min + 1)) + min),
            String(Math.floor(Math.random() * (max - min + 1)) + min),
          ]);
        } else {
          const names = ["🎲", "✨", "🎉", "🏆", "⭐", "💫", "🎯", "🌟"];
          setSlots([
            names[Math.floor(Math.random() * names.length)],
            names[Math.floor(Math.random() * names.length)],
            names[Math.floor(Math.random() * names.length)],
          ]);
        }
      }, 100);
      return () => clearInterval(interval);
    }
    if (session.status === "ended" && session.result) {
      setSpinning(false);
      const r = session.result;
      setSlots([r, r, r]);
    }
  }, [session?.id, session?.status, session?.result, session?.mode, session?.config]);

  // ended 시 슬롯을 결과로 고정
  useEffect(() => {
    if (session?.status === "ended" && session.result) {
      setSlots([session.result, session.result, session.result]);
      setSpinning(false);
    }
  }, [session?.status, session?.result]);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-2xl text-gray-500">추첨 대기 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 bg-gradient-to-b from-gray-900 to-black px-8">
      <h2 className="text-4xl font-bold text-amber-400">🎰 슬롯머신 추첨</h2>
      <div className="flex gap-4 rounded-2xl border-4 border-amber-500/50 bg-gray-900/80 p-8 shadow-2xl">
        {slots.map((s, i) => (
          <div
            key={i}
            className="flex h-32 w-28 items-center justify-center rounded-xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-600/30 to-amber-900/50 text-4xl font-bold text-white shadow-inner transition-transform duration-150"
            style={{
              animation: spinning ? "spin 0.1s linear infinite" : undefined,
            }}
          >
            {s}
          </div>
        ))}
      </div>
      {session.status === "ended" && session.result && (
        <div className="rounded-2xl border-2 border-green-500 bg-green-900/50 px-12 py-6">
          <p className="text-3xl font-bold text-green-400">🎉 당첨: {session.result}</p>
        </div>
      )}
      {session.status === "spinning" && (
        <p className="text-xl text-amber-300">추첨 중...</p>
      )}
    </div>
  );
}
