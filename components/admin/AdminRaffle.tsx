"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RaffleSession, Participant } from "@/lib/types";
import { useActiveRaffle } from "@/hooks/useActiveRaffle";

interface AdminRaffleProps {
  roomId: string;
  participants: Participant[];
}

export default function AdminRaffle({ roomId, participants }: AdminRaffleProps) {
  const { session } = useActiveRaffle(roomId);
  const [mode, setMode] = useState<"number_range" | "nicknames">("nicknames");
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [creating, setCreating] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const activeParticipants = participants.filter((p) => p.is_active);
  const nicknames = activeParticipants.map((p) => p.nickname);

  async function createAndStart() {
    setCreating(true);
    const config = mode === "number_range" ? { min, max } : {};
    const { data, error } = await supabase
      .from("raffle_sessions")
      .insert({
        room_id: roomId,
        mode,
        config,
        status: "waiting",
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      alert("추첨 생성 실패: " + error.message);
      return;
    }
    // 바로 spinning으로 전환하면 디스플레이에서 슬롯 시작
    await supabase
      .from("raffle_sessions")
      .update({ status: "spinning", started_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  async function drawResult() {
    if (!session) return;
    setSpinning(true);
    let result: string;
    if (session.mode === "number_range") {
      const range = (session.config?.max ?? 100) - (session.config?.min ?? 1) + 1;
      const offset = session.config?.min ?? 1;
      result = String(Math.floor(Math.random() * range) + offset);
    } else {
      if (nicknames.length === 0) {
        result = "(참가자 없음)";
      } else {
        result = nicknames[Math.floor(Math.random() * nicknames.length)];
      }
    }
    await supabase
      .from("raffle_sessions")
      .update({ status: "ended", result })
      .eq("id", session.id);
    setSpinning(false);
  }

  const canDraw = session?.status === "spinning" && (mode === "number_range" || nicknames.length > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">슬롯머신 추첨</h2>

      {session?.status === "ended" && (
        <div className="rounded-lg border border-green-700 bg-green-900/30 p-4">
          <p className="text-lg font-bold text-green-400">당첨: {session.result}</p>
        </div>
      )}

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-3 font-semibold text-white">모드 선택</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-white">
            <input
              type="radio"
              name="raffleMode"
              checked={mode === "nicknames"}
              onChange={() => setMode("nicknames")}
            />
            접속 유저 닉네임 ({nicknames.length}명)
          </label>
          <label className="flex items-center gap-2 text-white">
            <input
              type="radio"
              name="raffleMode"
              checked={mode === "number_range"}
              onChange={() => setMode("number_range")}
            />
            번호 범위
          </label>
        </div>
        {mode === "number_range" && (
          <div className="mt-3 flex items-center gap-2 text-gray-300">
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
              className="w-24 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-white"
            />
            ~
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              className="w-24 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-white"
            />
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {(!session || session.status === "ended") && (
            <button
              onClick={createAndStart}
              disabled={creating || (mode === "nicknames" && nicknames.length === 0)}
              className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              추첨 시작 (슬롯 돌리기)
            </button>
          )}
          {session?.status === "spinning" && (
            <button
              onClick={drawResult}
              disabled={spinning || !canDraw}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {spinning ? "추첨 중..." : "당첨자 결정"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
