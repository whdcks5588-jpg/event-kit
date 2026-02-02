"use client";

import { useEffect, useState } from "react";
import { useActiveQuiz } from "@/hooks/useActiveQuiz";
import type { QuizSession } from "@/lib/types";

interface DisplayQuizProps {
  roomId: string;
}

export default function DisplayQuiz({ roomId }: DisplayQuizProps) {
  const { session } = useActiveQuiz(roomId);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!session || session.status !== "active" || !session.started_at) {
      setSecondsLeft(null);
      return;
    }
    const limit = session.time_limit_seconds ?? 30;
    const start = new Date(session.started_at).getTime();
    const end = start + limit * 1000;

    function tick() {
      const now = Date.now();
      if (now >= end) {
        setSecondsLeft(0);
        return;
      }
      setSecondsLeft(Math.ceil((end - now) / 1000));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status, session?.started_at, session?.time_limit_seconds]);

  if (!session || session.status === "waiting") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-2xl text-gray-500">퀴즈 대기 중...</p>
      </div>
    );
  }

  if (session.status === "ended") {
    const correctIdx = session.correct_answer;
    const opts = (session.options as string[]) || [];
    const correctLabel = typeof correctIdx === "number" && opts[correctIdx] != null ? opts[correctIdx] : "정답";
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
        <h2 className="text-3xl font-bold text-white">퀴즈 종료</h2>
        <p className="text-xl text-amber-400">정답: {correctLabel}</p>
      </div>
    );
  }

  const opts = (session.options as string[]) || [];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-8">
      <h2 className="text-2xl font-bold text-white">{session.title || "퀴즈"}</h2>
      <p className="text-center text-3xl font-semibold text-white">{session.question}</p>
      
      {session.image_url && (
        <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border-2 border-white/20 bg-black/40">
          <img
            src={session.image_url}
            alt="Quiz"
            className="h-full w-full object-contain"
          />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {opts.map((opt, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-xl text-white backdrop-blur-sm"
          >
            {String.fromCharCode(65 + i)}. {opt}
          </div>
        ))}
      </div>
      <div className="rounded-full bg-amber-500/90 px-8 py-3 text-2xl font-bold text-black">
        ⏱ {secondsLeft != null ? secondsLeft : "—"}초
      </div>
    </div>
  );
}
