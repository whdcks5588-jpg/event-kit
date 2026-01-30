"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateSessionToken } from "@/lib/utils";
import type { Participant, Message, Room } from "@/lib/types";
import ParticipantView from "@/components/ParticipantView";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNicknameForm, setShowNicknameForm] = useState(false);

  useEffect(() => {
    loadRoom();
    checkSession();
  }, [roomId]);

  async function loadRoom() {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (error) {
      console.error("Room load error:", error);
      return;
    }

    setRoom(data as Room);
  }

  async function checkSession() {
    const sessionToken = localStorage.getItem(`session_${roomId}`);
    if (!sessionToken) {
      setShowNicknameForm(true);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("session_token", sessionToken)
      .eq("room_id", roomId)
      .single();

    if (error || !data) {
      localStorage.removeItem(`session_${roomId}`);
      setShowNicknameForm(true);
      setIsLoading(false);
      return;
    }

    // 세션 만료 체크 (24시간)
    const lastSeen = new Date(data.last_seen_at);
    const now = new Date();
    const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastSeen > 24) {
      localStorage.removeItem(`session_${roomId}`);
      setShowNicknameForm(true);
      setIsLoading(false);
      return;
    }

    setParticipant(data as Participant);
    setIsLoading(false);

    // 세션 갱신
    await supabase
      .from("participants")
      .update({ last_seen_at: new Date().toISOString(), is_active: true })
      .eq("id", data.id);
  }

  async function handleJoin(nickname: string) {
    const sessionToken = generateSessionToken();
    localStorage.setItem(`session_${roomId}`, sessionToken);

    const { data, error } = await supabase
      .from("participants")
      .insert({
        nickname: nickname.trim(),
        room_id: roomId,
        session_token: sessionToken,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Join error:", error);
      alert("참가 중 오류가 발생했습니다.");
      return;
    }

    setParticipant(data as Participant);
    setShowNicknameForm(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (showNicknameForm) {
    return <NicknameForm onSubmit={handleJoin} />;
  }

  if (!room || !participant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-500">방을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <ParticipantView room={room} participant={participant} roomId={roomId} />
  );
}

function NicknameForm({ onSubmit }: { onSubmit: (nickname: string) => void }) {
  const [nickname, setNickname] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nickname.trim().length < 2) {
      alert("닉네임은 2자 이상 입력해주세요.");
      return;
    }
    onSubmit(nickname.trim());
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          이벤트 참가
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            maxLength={20}
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            참가하기
          </button>
        </form>
      </div>
    </div>
  );
}
