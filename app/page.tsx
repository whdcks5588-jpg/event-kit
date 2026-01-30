"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [roomTitle, setRoomTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!roomTitle.trim() || isCreating) return;

    setIsCreating(true);

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        title: roomTitle.trim(),
        status: "waiting",
        current_program: "chat",
      })
      .select()
      .single();

    setIsCreating(false);

    if (error) {
      console.error("Create room error:", error);
      alert("방 생성에 실패했습니다.");
      return;
    }

    router.push(`/room/${data.id}/admin`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold text-white">이벤트 킷</h1>
          <p className="text-xl text-gray-400">
            기업 행사용 실시간 이벤트 플랫폼
          </p>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-sm">
          <h2 className="mb-6 text-2xl font-semibold text-white">
            새 이벤트 방 만들기
          </h2>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <input
              type="text"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder="이벤트 제목을 입력하세요"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              maxLength={100}
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={!roomTitle.trim() || isCreating}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "생성 중..." : "이벤트 방 만들기"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>이벤트 킷으로 실시간 채팅, 퀴즈, 추첨을 진행하세요</p>
        </div>
      </div>
    </div>
  );
}
