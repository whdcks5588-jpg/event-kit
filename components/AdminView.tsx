"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Participant, Message } from "@/lib/types";

interface AdminViewProps {
  room: Room;
  roomId: string;
  participants: Participant[];
  messages: Message[];
  onRoomUpdate: () => void;
}

export default function AdminView({
  room,
  roomId,
  participants,
  messages,
  onRoomUpdate,
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<"participants" | "messages" | "control">(
    "participants"
  );
  const [selectedProgram, setSelectedProgram] = useState<string>(
    room.current_program || "chat"
  );

  // room.current_program이 변경되면 selectedProgram도 업데이트
  useEffect(() => {
    if (room.current_program) {
      setSelectedProgram(room.current_program);
    }
  }, [room.current_program]);

  async function handleDeleteMessage(messageId: string) {
    if (!confirm("이 메시지를 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_blocked: true })
      .eq("id", messageId);

    if (error) {
      console.error("Delete message error:", error);
      alert("메시지 삭제에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }

  async function handleBlockParticipant(participantId: string) {
    if (!confirm("이 참가자를 차단하시겠습니까?")) return;

    const { error } = await supabase
      .from("participants")
      .update({ is_active: false })
      .eq("id", participantId);

    if (error) {
      console.error("Block participant error:", error);
      alert("참가자 차단에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }

  async function handleChangeProgram(program: string) {
    const { error } = await supabase
      .from("rooms")
      .update({ current_program: program })
      .eq("id", roomId);

    if (error) {
      console.error("Change program error:", error);
      alert("프로그램 변경에 실패했습니다.");
      return;
    }

    setSelectedProgram(program);
    onRoomUpdate();
  }

  async function handleToggleRoomStatus() {
    const newStatus = room.status === "active" ? "waiting" : "active";
    const { error } = await supabase
      .from("rooms")
      .update({ status: newStatus })
      .eq("id", roomId);

    if (error) {
      console.error("Toggle status error:", error);
      alert("상태 변경에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-800 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{room.title}</h1>
            <p className="text-sm text-gray-400">
              상태: {room.status === "active" ? "활성" : "대기"}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/room/${roomId}/display`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-purple-700"
            >
              디스플레이 열기
            </a>
            <button
              onClick={handleToggleRoomStatus}
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                room.status === "active"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {room.status === "active" ? "이벤트 종료" : "이벤트 시작"}
            </button>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="border-b border-gray-800 bg-gray-800">
        <div className="flex">
          <button
            onClick={() => setActiveTab("participants")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "participants"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            참가자 ({participants.length})
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "messages"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            메시지 ({messages.length})
          </button>
          <button
            onClick={() => setActiveTab("control")}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === "control"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            프로그램 제어
          </button>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-6">
        {activeTab === "participants" && (
          <div className="space-y-2">
            {participants.length === 0 ? (
              <p className="text-gray-400">참가자가 없습니다.</p>
            ) : (
              participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800 p-4"
                >
                  <div>
                    <div className="font-semibold">{participant.nickname}</div>
                    <div className="text-sm text-gray-400">
                      {participant.is_active ? "활성" : "비활성"} ·{" "}
                      {new Date(participant.last_seen_at).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  {participant.is_active && (
                    <button
                      onClick={() => handleBlockParticipant(participant.id)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-700"
                    >
                      차단
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="space-y-2">
            {messages.length === 0 ? (
              <p className="text-gray-400">메시지가 없습니다.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800 p-4"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-blue-400">
                      {message.nickname}
                    </div>
                    <div className="text-gray-300">{message.content}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleString("ko-KR")}
                      {message.is_blocked && (
                        <span className="ml-2 text-red-400">[차단됨]</span>
                      )}
                    </div>
                  </div>
                  {!message.is_blocked && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="ml-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-700"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "control" && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-bold">현재 프로그램</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {["chat", "quiz", "raffle", "poll"].map((program) => (
                  <button
                    key={program}
                    onClick={() => handleChangeProgram(program)}
                    className={`rounded-lg border-2 p-4 font-semibold transition-colors ${
                      selectedProgram === program
                        ? "border-blue-500 bg-blue-600"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    {program === "chat" && "채팅"}
                    {program === "quiz" && "퀴즈"}
                    {program === "raffle" && "추첨"}
                    {program === "poll" && "투표"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
