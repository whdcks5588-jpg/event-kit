"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActivePoll } from "@/hooks/useActivePoll";
import type { Participant } from "@/lib/types";

interface ParticipantPollProps {
  roomId: string;
  participant: Participant;
}

export default function ParticipantPoll({ roomId, participant }: ParticipantPollProps) {
  const { session } = useActivePoll(roomId);
  const [voted, setVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submitVote(optionIndex: number) {
    if (!session || session.status !== "active" || voted || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: session.id,
      participant_id: participant.id,
      option_index: optionIndex,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") setVoted(true);
      else alert("투표 실패: " + error.message);
      return;
    }
    setVoted(true);
  }

  if (!session) {
    return (
      <div className="flex min-h-[120px] items-center justify-center p-4">
        <p className="text-gray-500">투표 대기 중...</p>
      </div>
    );
  }

  if (session.status !== "active") {
    return (
      <div className="flex min-h-[120px] items-center justify-center p-4">
        <p className="text-white">투표가 종료되었습니다.</p>
      </div>
    );
  }

  const opts = (session.options as string[]) || [];
  if (voted) {
    return (
      <div className="flex min-h-[120px] items-center justify-center p-4">
        <p className="text-green-400">투표를 완료했습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <h3 className="font-semibold text-white">{session.title}</h3>
      <div className="flex flex-col gap-2">
        {opts.map((opt, i) => (
          <button
            key={i}
            onClick={() => submitVote(i)}
            disabled={submitting}
            className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-left text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
