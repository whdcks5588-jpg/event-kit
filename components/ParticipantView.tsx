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
  const [nickname, setNickname] = useState(participant.nickname);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevProgramRef = useRef(program);

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
    if (program === "chat") {
      const isProgramChanged = prevProgramRef.current !== "chat";
      scrollToBottom(isProgramChanged ? "auto" : "smooth");
    }
    prevProgramRef.current = program;
  }, [messages, program]);

  // 전송 완료 후 입력창 포커스 복구
  useEffect(() => {
    if (!isSending && program === "chat" && !isEditingNickname) {
      inputRef.current?.focus();
    }
  }, [isSending, program, isEditingNickname]);

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

  async function handleUpdateNickname() {
    if (!nickname.trim() || nickname === participant.nickname) {
      setIsEditingNickname(false);
      return;
    }

    const { error } = await supabase
      .from("participants")
      .update({ nickname: nickname.trim() })
      .eq("id", participant.id);

    if (error) {
      alert("닉네임 수정에 실패했습니다.");
      setNickname(participant.nickname);
    }
    setIsEditingNickname(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();

    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      participant_id: participant.id,
      nickname: nickname, // 현재 상태의 닉네임 사용
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

  const CommonHeader = () => (
    <header className="border-b border-gray-800 bg-gray-800 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300 leading-tight">
            안녕하세요 <span className="font-bold text-white">{nickname}</span>님
            <br />
            <span className="font-bold text-blue-400">{displayRoom.title}</span>에 오신걸 환영합니다
          </p>
        </div>
        <button
          onClick={() => setIsEditingNickname(true)}
          className="shrink-0 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-600 transition-colors shadow-sm"
        >
          수정
        </button>
      </div>

      {/* 닉네임 수정 모달 */}
      {isEditingNickname && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-gray-800 p-6 shadow-2xl border border-gray-700">
            <h2 className="mb-4 text-xl font-bold text-white">닉네임 수정</h2>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mb-4 w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleUpdateNickname()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingNickname(false)}
                className="flex-1 rounded-xl bg-gray-700 py-3 font-semibold text-white hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdateNickname}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }

  // 로고 전체화면 모드 (참가자 화면)
  if (displayRoom?.room_show_logo_only) {
    return (
      <div className="flex h-screen flex-col bg-gray-900">
        <CommonHeader />
        <div className="flex flex-1 items-center justify-center p-4">
          {displayRoom.logo_url ? (
            <img
              src={displayRoom.logo_url}
              alt="Logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-4xl font-bold text-white text-center">
              {displayRoom.title}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 퀴즈 / 추첨 / 투표 화면 (실시간 프로그램 전환)
  if (program === "quiz") {
    return (
      <div className="flex h-screen flex-col bg-gray-900">
        <CommonHeader />
        <div className="flex-1 overflow-y-auto">
          <ParticipantQuiz roomId={roomId} participant={participant} room={displayRoom} />
        </div>
      </div>
    );
  }
  if (program === "raffle") {
    return (
      <div className="flex h-screen flex-col bg-gray-900">
        <CommonHeader />
        <div className="flex-1 overflow-y-auto">
          <ParticipantRaffle roomId={roomId} />
        </div>
      </div>
    );
  }
  if (program === "poll") {
    return (
      <div className="flex h-screen flex-col bg-gray-900">
        <CommonHeader />
        <div className="flex-1 overflow-y-auto">
          <ParticipantPoll roomId={roomId} participant={participant} />
        </div>
      </div>
    );
  }

  // 채팅
  return (
    <div className="flex h-screen flex-col bg-gray-900">
      <CommonHeader />

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
            ref={inputRef}
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
