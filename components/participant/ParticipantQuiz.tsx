"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveQuiz } from "@/hooks/useActiveQuiz";
import type { Participant } from "@/lib/types";

interface ParticipantQuizProps {
  roomId: string;
  participant: Participant;
}

export default function ParticipantQuiz({ roomId, participant }: ParticipantQuizProps) {
  const { session } = useActiveQuiz(roomId);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submitAnswer(optionIndex: number) {
    if (!session || session.status !== "active" || submitted || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("quiz_answers").insert({
      session_id: session.id,
      participant_id: participant.id,
      nickname: participant.nickname,
      answer: optionIndex,
      is_correct: null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") setSubmitted(true); // unique (session_id, participant_id)
      else alert("제출 실패: " + error.message);
      return;
    }
    setSubmitted(true);
  }

  if (!session) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-4">
        <p className="text-gray-500">퀴즈 대기 중...</p>
      </div>
    );
  }

  if (session.status === "waiting") {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-4">
        <p className="text-gray-500">곧 퀴즈가 시작됩니다.</p>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-4">
        <p className="text-white">퀴즈가 종료되었습니다.</p>
      </div>
    );
  }

  const opts = (session.options as string[]) || [];
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold text-white">{session.question}</h3>
      
      {session.image_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-700 bg-black">
          <img
            src={session.image_url}
            alt="Quiz"
            className="h-full w-full object-contain"
          />
        </div>
      )}

      {submitted ? (
        <p className="text-green-400">답변을 제출했습니다.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {opts.map((opt, i) => (
            <button
              key={i}
              onClick={() => submitAnswer(i)}
              disabled={submitting}
              className="rounded-lg border-2 border-gray-600 bg-gray-800 px-4 py-3 text-left text-white transition-colors hover:border-blue-500 hover:bg-gray-700 disabled:opacity-50"
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
