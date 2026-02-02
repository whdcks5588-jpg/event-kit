"use client";

import { useActiveRaffle } from "@/hooks/useActiveRaffle";

interface ParticipantRaffleProps {
  roomId: string;
}

export default function ParticipantRaffle({ roomId }: ParticipantRaffleProps) {
  const { session } = useActiveRaffle(roomId);

  if (!session) {
    return (
      <div className="flex min-h-[120px] items-center justify-center p-4">
        <p className="text-gray-500">추첨 대기 중...</p>
      </div>
    );
  }

  if (session.status === "ended" && session.result) {
    return (
      <div className="flex min-h-[120px] items-center justify-center p-4">
        <p className="text-xl font-semibold text-amber-400">🎉 당첨: {session.result}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[120px] items-center justify-center p-4">
      <p className="text-lg text-white">추첨이 진행 중입니다. 대형 화면을 확인하세요!</p>
    </div>
  );
}
