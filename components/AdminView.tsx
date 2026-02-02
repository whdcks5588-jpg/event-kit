"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Participant, Message } from "@/lib/types";
import AdminQuiz from "./admin/AdminQuiz";
import AdminRaffle from "./admin/AdminRaffle";
import AdminPoll from "./admin/AdminPoll";

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

  async function handleToggleLogoOnly() {
    const { error } = await supabase
      .from("rooms")
      .update({ room_show_logo_only: !room.room_show_logo_only })
      .eq("id", roomId);

    if (error) {
      console.error("Toggle logo error:", error);
      alert("로고 설정 변경에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }


  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white overflow-hidden">
      {/* 헤더 */}
      <header className="border-b border-gray-800 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">{room.title}</h1>
              <p className="text-sm text-gray-400">
                상태: {room.status === "active" ? "활성" : "대기"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleLogoOnly}
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                room.room_show_logo_only
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {room.room_show_logo_only ? "로고 전체화면 끄기" : "로고 전체화면 켜기"}
            </button>
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

      <div className="flex min-h-0 flex-1 flex-col p-6">
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[360px_1fr]">
          {/* 왼쪽 컬럼: 참가자용 프리뷰 & 채팅 모니터링 */}
          <div className="flex min-h-0 flex-col gap-6">
            {/* 참가자 프리뷰 */}
            <div className="rounded-lg border border-gray-800 bg-gray-800 overflow-hidden">
              <div className="border-b border-gray-700 bg-gray-700/50 px-4 py-2 text-sm font-semibold text-gray-300">
                참가자 화면 프리뷰
              </div>
              <div className="aspect-[9/16] w-full overflow-hidden bg-gray-900">
                <iframe
                  title="participant-preview"
                  src={`/room/${roomId}`}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* 실시간 채팅 모니터링 */}
            <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-800 bg-gray-800">
              <div className="border-b border-gray-700 bg-gray-700/50 px-4 py-2 text-sm font-semibold text-gray-300">
                실시간 채팅 ({messages.length})
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">메시지가 없습니다.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="group relative rounded bg-gray-900/50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-blue-400 text-sm">{message.nickname}</span>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity"
                        >
                          삭제
                        </button>
                      </div>
                      <p className="text-sm text-gray-300 break-all">{message.content}</p>
                      {message.is_blocked && (
                        <div className="mt-1 text-[10px] text-red-400 font-bold">[차단된 메시지]</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽 컬럼: 프로그램 제어 및 설정 */}
          <div className="flex min-h-0 flex-col rounded-lg border border-gray-800 bg-gray-800">
            <div className="flex border-b border-gray-700 bg-gray-700/50">
              <button
                onClick={() => setActiveTab("control")}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "control"
                    ? "bg-gray-800 text-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                프로그램 제어
              </button>
              <button
                onClick={() => setActiveTab("participants")}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "participants"
                    ? "bg-gray-800 text-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                참가자 관리 ({participants.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "control" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="mb-4 text-xl font-bold">프로그램 전환</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {["chat", "quiz", "raffle", "poll"].map((program) => (
                        <button
                          key={program}
                          onClick={() => handleChangeProgram(program)}
                          className={`rounded-lg border-2 p-4 text-center font-semibold transition-all ${
                            selectedProgram === program
                              ? "border-blue-500 bg-blue-600 shadow-lg shadow-blue-900/20"
                              : "border-gray-700 bg-gray-900 hover:border-gray-600"
                          }`}
                        >
                          <div className="text-lg mb-1">
                            {program === "chat" && "💬"}
                            {program === "quiz" && "❓"}
                            {program === "raffle" && "🎁"}
                            {program === "poll" && "📊"}
                          </div>
                          <div className="text-sm">
                            {program === "chat" && "기본 채팅"}
                            {program === "quiz" && "퀴즈"}
                            {program === "raffle" && "추첨"}
                            {program === "poll" && "투표"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-8">
                    {selectedProgram === "quiz" && <AdminQuiz roomId={roomId} />}
                    {selectedProgram === "raffle" && <AdminRaffle roomId={roomId} participants={participants} />}
                    {selectedProgram === "poll" && <AdminPoll roomId={roomId} />}
                    {selectedProgram === "chat" && (
                      <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-700 text-gray-500">
                        기본 채팅 프로그램이 활성화되어 있습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "participants" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {participants.length === 0 ? (
                    <p className="col-span-full text-center py-10 text-gray-500">참가자가 없습니다.</p>
                  ) : (
                    participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 p-4"
                      >
                        <div>
                          <div className="font-semibold">{participant.nickname}</div>
                          <div className="text-xs text-gray-500">
                            {participant.is_active ? "🟢 활성" : "🔴 차단됨"} · {new Date(participant.last_seen_at).toLocaleTimeString()}
                          </div>
                        </div>
                        {participant.is_active && (
                          <button
                            onClick={() => handleBlockParticipant(participant.id)}
                            className="rounded bg-red-900/30 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/50 transition-colors"
                          >
                            차단
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
