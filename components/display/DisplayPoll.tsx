"use client";

import { useActivePoll } from "@/hooks/useActivePoll";

interface DisplayPollProps {
  roomId: string;
}

export default function DisplayPoll({ roomId }: DisplayPollProps) {
  const { session, counts } = useActivePoll(roomId);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-2xl text-gray-500">투표 대기 중...</p>
      </div>
    );
  }

  const opts = (session.options as string[]) || [];
  const total = counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-12">
      <h2 className="text-4xl font-bold text-white">{session.title}</h2>
      <div className="w-full max-w-2xl space-y-6">
        {opts.map((label, i) => {
          const count = counts[i] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-lg text-white">
                <span>{label}</span>
                <span>
                  {count}표 {total > 0 && `(${pct.toFixed(0)}%)`}
                </span>
              </div>
              <div className="h-10 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 ease-out"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
