"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Message } from "@/lib/types";
import { useRoomProgram } from "@/hooks/useRoomProgram";
import DisplayQuiz from "./display/DisplayQuiz";
import DisplayRaffle from "./display/DisplayRaffle";
import DisplayPoll from "./display/DisplayPoll";

interface DisplayViewProps {
  room: Room;
  roomId: string;
  qrCodeUrl: string;
  participantCount: number;
}

export default function DisplayView({
  room,
  roomId,
  qrCodeUrl,
  participantCount,
}: DisplayViewProps) {
  const { room: liveRoom } = useRoomProgram(roomId);
  const displayRoom = liveRoom ?? room;
  const program = displayRoom?.current_program ?? "chat";

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    // 메시지 실시간 구독
    const messagesChannel = supabase
      .channel(`display-messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Display message event:", payload.eventType);
          if (payload.eventType === "INSERT") {
            const message = payload.new as Message;
            if (!message.is_blocked) {
              setMessages((prev) => {
                // 중복 체크
                if (prev.some((m) => m.id === message.id)) {
                  return prev;
                }
                return [message, ...prev].slice(0, 100);
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const message = payload.new as Message;
            if (message.is_blocked) {
              setMessages((prev) => prev.filter((m) => m.id !== message.id));
            } else {
              setMessages((prev) => {
                if (prev.some((m) => m.id === message.id)) {
                  return prev.map((m) => (m.id === message.id ? message : m));
                }
                return [message, ...prev].slice(0, 100);
              });
            }
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Display messages channel status:", status);
      });

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 로고 전체화면 모드
  if (displayRoom?.room_show_logo_only) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900">
        <div className="mb-8 text-6xl font-bold text-white">{displayRoom.title}</div>
        {qrCodeUrl && (
          <div className="rounded-2xl bg-white p-6 shadow-2xl">
            <img src={qrCodeUrl} alt="QR" width={300} height={300} />
            <p className="mt-4 text-center text-xl font-bold text-gray-900">
              QR코드를 스캔하여 참가하세요!
            </p>
          </div>
        )}
        <div className="mt-12 text-2xl text-gray-400">접속자: {participantCount}명</div>
      </div>
    );
  }

  // 퀴즈/추첨/투표 시 해당 화면 전체 표시
  if (program === "quiz") {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {qrCodeUrl && (
          <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-2 shadow-2xl">
            <img src={qrCodeUrl} alt="QR" width={120} height={120} className="rounded" />
          </div>
        )}
        <div className="absolute left-1/2 top-8 z-10 -translate-x-1/2 transform">
          <div className="rounded-full bg-blue-600/90 px-6 py-2 backdrop-blur-sm">
            <span className="text-2xl font-bold text-white">접속자: {participantCount}명</span>
          </div>
        </div>
        <div className="flex h-full items-center justify-center pt-24">
          <DisplayQuiz roomId={roomId} />
        </div>
      </div>
    );
  }
  if (program === "raffle") {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {qrCodeUrl && (
          <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-2 shadow-2xl">
            <img src={qrCodeUrl} alt="QR" width={120} height={120} className="rounded" />
          </div>
        )}
        <div className="absolute left-1/2 top-8 z-10 -translate-x-1/2 transform">
          <div className="rounded-full bg-blue-600/90 px-6 py-2 backdrop-blur-sm">
            <span className="text-2xl font-bold text-white">접속자: {participantCount}명</span>
          </div>
        </div>
        <div className="flex h-full items-center justify-center pt-24">
          <DisplayRaffle roomId={roomId} />
        </div>
      </div>
    );
  }
  if (program === "poll") {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {qrCodeUrl && (
          <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-2 shadow-2xl">
            <img src={qrCodeUrl} alt="QR" width={120} height={120} className="rounded" />
          </div>
        )}
        <div className="absolute left-1/2 top-8 z-10 -translate-x-1/2 transform">
          <div className="rounded-full bg-blue-600/90 px-6 py-2 backdrop-blur-sm">
            <span className="text-2xl font-bold text-white">접속자: {participantCount}명</span>
          </div>
        </div>
        <div className="flex h-full items-center justify-center pt-24">
          <DisplayPoll roomId={roomId} />
        </div>
      </div>
    );
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_blocked", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Messages load error:", error);
      return;
    }

    setMessages((data as Message[]) || []);
  }


  function scrollToBottom() {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* QR 코드 (왼쪽 상단 고정) */}
      {qrCodeUrl && (
        <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-2 shadow-2xl">
          <img
            src={qrCodeUrl}
            alt="QR Code"
            width={120}
            height={120}
            className="rounded"
          />
        </div>
      )}

      {/* 접속자 수 (중앙 상단) */}
      <div className="absolute left-1/2 top-8 z-10 -translate-x-1/2 transform">
        <div className="rounded-full bg-blue-600/90 px-6 py-2 backdrop-blur-sm">
          <span className="text-2xl font-bold text-white">
            접속자: {participantCount}명
          </span>
        </div>
      </div>

      {/* 실시간 채팅 월 */}
      <div
        ref={messagesContainerRef}
        className="flex h-full flex-col justify-end overflow-y-auto px-8 pb-8 pt-24"
      >
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500">
              아직 메시지가 없습니다.
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [isVisible, setIsVisible] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 애니메이션 트리거
    setTimeout(() => {
      setIsVisible(true);
    }, 10);
  }, []);

  return (
    <div
      ref={bubbleRef}
      className={`transform transition-all duration-700 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-8 opacity-0 scale-95"
      }`}
    >
      <div className="inline-block max-w-2xl rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-md shadow-lg border border-white/5">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-semibold text-blue-400">{message.nickname}</span>
          <span className="text-xs text-gray-400">
            {new Date(message.created_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-lg text-white leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
