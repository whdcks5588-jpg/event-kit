"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PollSession } from "@/lib/types";
import { useActivePoll } from "@/hooks/useActivePoll";

interface AdminPollProps {
  roomId: string;
}

export default function AdminPoll({ roomId }: AdminPollProps) {
  const { session, counts } = useActivePoll(roomId);
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function createAndStart() {
    const opts = options.filter(Boolean);
    if (opts.length < 2) {
      alert("항목을 2개 이상 입력하세요.");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("poll_sessions")
      .insert({
        room_id: roomId,
        title: title.trim() || "투표",
        options: opts,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      alert("투표 생성 실패: " + error.message);
      return;
    }
    setTitle("");
    setOptions(["", ""]);
  }

  async function endPoll(pollId: string) {
    await supabase
      .from("poll_sessions")
      .update({ status: "ended" })
      .eq("id", pollId);
  }

  const opts = (session?.options as string[]) || [];
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">실시간 투표</h2>

      {session && (session.status === "active" || session.status === "ended") && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <h3 className="font-semibold text-white">{session.title}</h3>
          <div className="mt-2 space-y-2">
            {opts.map((label, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-300">
                <span className="w-32 truncate">{label}</span>
                <span>{counts[i] ?? 0}표</span>
                {total > 0 && (
                  <span className="text-sm text-gray-500">
                    ({Math.round(((counts[i] ?? 0) / total) * 100)}%)
                  </span>
                )}
              </div>
            ))}
          </div>
          {session.status === "active" && (
            <button
              onClick={() => endPoll(session.id)}
              className="mt-3 rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            >
              투표 종료
            </button>
          )}
        </div>
      )}

      {(!session || session.status === "ended") && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <h3 className="mb-3 font-semibold text-white">새 투표 (동적 항목)</h3>
          <input
            type="text"
            placeholder="투표 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`항목 ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  className="flex-1 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="rounded bg-red-600 px-2 text-white hover:bg-red-700"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm text-blue-400 hover:underline"
          >
            + 항목 추가
          </button>
          <button
            onClick={createAndStart}
            disabled={creating || options.filter(Boolean).length < 2}
            className="mt-4 block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            투표 시작
          </button>
        </div>
      )}
    </div>
  );
}
