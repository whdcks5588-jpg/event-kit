"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Participant, Message, Room } from "@/lib/types";
import { useRoomProgram } from "@/hooks/useRoomProgram";
import ParticipantQuiz from "./participant/ParticipantQuiz";
import ParticipantRaffle from "./participant/ParticipantRaffle";
import ParticipantPoll from "./participant/ParticipantPoll";

interface ParticipantViewProps {
  room: Room;
  participant: Participant;
  roomId: string;
}

export default function ParticipantView({
  room,
  participant,
  roomId,
}: ParticipantViewProps) {
  const { room: liveRoom } = useRoomProgram(roomId);
  const displayRoom = liveRoom ?? room;
  const program = displayRoom?.current_program ?? "chat";

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 로고 전체화면 모드 (참가자 화면)
  if (displayRoom?.room_show_logo_only) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 px-6 text-center">
        <div className="mb-6 text-3xl font-bold text-white">{displayRoom.title}</div>
        <div className="rounded-xl bg-gray-800 p-6 shadow-xl border border-gray-700">
          <p className="text-lg text-gray-300">
            현재 로고 화면이 표시 중입니다.<br />
            잠시만 기다려 주세요!
          </p>
        </div>
        <div className="mt-8 text-sm text-gray-500">참가자: {participant.nickname}</div>
      </div>
    );
  }

  useEffect(() => {
    loadMessages();

    // 메시지 구독
    const messagesChannel = supabase
      .channel(`messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Message event:", payload.eventType);
          if (payload.eventType === "INSERT") {
            const message = payload.new as Message;
            if (!message.is_blocked) {
              setMessages((prev) => {
                // 중복 체크
                if (prev.some((m) => m.id === message.id)) {
                  return prev;
                }
                return [...prev, message];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const message = payload.new as Message;
            if (message.is_blocked) {
              setMessages((prev) => prev.filter((m) => m.id !== message.id));
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.id === message.id ? message : m))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Messages channel status:", status);
      });

    // 방 상태 구독
    const roomChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Room updated:", payload.new);
        }
      )
      .subscribe();

    // 주기적으로 세션 갱신
    const interval = setInterval(() => {
      supabase
        .from("participants")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", participant.id);
    }, 30000); // 30초마다

    return () => {
      clearInterval(interval);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, participant.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_blocked", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Messages load error:", error);
      return;
    }

    setMessages((data as Message[]) || []);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();

    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      participant_id: participant.id,
      nickname: participant.nickname,
      content,
      is_blocked: false,
    });

    setIsSending(false);

    if (error) {
      console.error("Send message error:", error);
      alert("메시지 전송에 실패했습니다.");
      return;
    }

    setNewMessage("");
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // 퀴즈 / 추첨 / 투표 화면 (실시간 프로그램 전환)
  if (program === "quiz") {
    return (
      <div className="flex h-screen flex-col bg-gray-900">
        <header className="border-b border-gray-800 bg-gray-800 px-4 py-3">
          <h1 className="text-lg font-semibold text-white">{displayRoom.title}</h1>
          <p className="text-sm text-gray-400">퀴즈 · {participant.nickname}님</p>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ParticipantQuiz roomId={roomId} participant={participant} />
        </div>
      </div>
    );
  }
  if (program === "raffle") {
    return (
      <div className="flex h-screen flex-col bg-gray-900">
        <header className="border-b border-gray-800 bg-gray-800 px-4 py-3">
          <h1 className="text-lg font-semibold text-white">{displayRoom.title}</h1>
          <p className="text-sm text-gray-400">추첨 · {participant.nickname}님</p>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ParticipantRaffle roomId={roomId} />
        </div>
      </div>
    );
  }
  if (program === "poll") {
    return (
      <div className="flex h-screen flex-col bg-gray-900">
        <header className="border-b border-gray-800 bg-gray-800 px-4 py-3">
          <h1 className="text-lg font-semibold text-white">{displayRoom.title}</h1>
          <p className="text-sm text-gray-400">투표 · {participant.nickname}님</p>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ParticipantPoll roomId={roomId} participant={participant} />
        </div>
      </div>
    );
  }

  // 채팅
  return (
    <div className="flex h-screen flex-col bg-gray-900">
      <header className="border-b border-gray-800 bg-gray-800 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">{displayRoom.title}</h1>
        <p className="text-sm text-gray-400">안녕하세요, {participant.nickname}님</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.participant_id === participant.id
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.participant_id === participant.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                {message.participant_id !== participant.id && (
                  <div className="mb-1 text-xs font-semibold text-gray-400">
                    {message.nickname}
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div className="mt-1 text-xs opacity-70">
                  {new Date(message.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-800 bg-gray-800 px-4 py-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            maxLength={200}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}
