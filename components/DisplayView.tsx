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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevProgramRef = useRef(program);

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
                return [...prev, message].slice(-100);
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
                return [...prev, message].slice(-100);
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
    if (program === "chat") {
      const isProgramChanged = prevProgramRef.current !== "chat";
      scrollToBottom(isProgramChanged ? "auto" : "smooth");
    }
    prevProgramRef.current = program;
  }, [messages, program]);

  if (displayRoom?.room_show_qr_only) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-12">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            {displayRoom.title}
          </h1>
          <p className="text-2xl text-gray-600">QR 코드를 스캔하여 참여하세요!</p>
        </div>
        <div className="relative aspect-square w-full max-w-[60vh] overflow-hidden rounded-3xl border-[12px] border-gray-100 bg-white p-8 shadow-2xl">
          <img src={qrCodeUrl} alt="QR Code" className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (displayRoom?.room_show_logo_only) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 p-8">
        {displayRoom.logo_url ? (
          <img
            src={displayRoom.logo_url}
            alt="Logo"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-8xl font-bold text-white text-center">
            {displayRoom.title}
          </div>
        )}
      </div>
    );
  }

  // 퀴즈/추첨/투표 시 해당 화면 전체 표시
  if (program === "quiz") {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="flex h-full items-center justify-center">
          <DisplayQuiz roomId={roomId} room={displayRoom} />
        </div>
      </div>
    );
  }
  if (program === "raffle") {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute right-8 top-8 z-10">
          <div className="rounded-full bg-blue-600/90 px-4 py-1 backdrop-blur-sm">
            <span className="text-lg font-bold text-white">접속자: {participantCount}명</span>
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
        <div className="absolute right-8 top-8 z-10">
          <div className="rounded-full bg-blue-600/90 px-4 py-1 backdrop-blur-sm">
            <span className="text-lg font-bold text-white">접속자: {participantCount}명</span>
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
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Messages load error:", error);
      return;
    }

    setMessages((data as Message[]) || []);
  }


  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-gray-900">
      {/* Top Header/Logo */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-8">
        {displayRoom.logo_url ? (
          <img
            src={displayRoom.logo_url}
            alt="Event Logo"
            className="h-24 object-contain"
          />
        ) : (
          <h1 className="text-5xl font-bold text-white tracking-tight">
            {displayRoom.title}
          </h1>
        )}
      </div>

      {/* Participant Count (Top Right) */}
      <div className="absolute right-8 top-8 z-20">
        <div className="rounded-full bg-blue-600/90 px-5 py-2 backdrop-blur-md shadow-lg border border-blue-400/30">
          <span className="text-xl font-bold text-white">
            접속자: {participantCount}명
          </span>
        </div>
      </div>

      {/* Chat Area (Centered, Below Logo) */}
      <div className="flex-1 flex flex-col items-center min-h-0">
        <div className="w-full max-w-4xl px-8 flex flex-col gap-4 overflow-y-auto py-4 no-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="max-w-[80%] rounded-2xl bg-white/10 px-8 py-4 backdrop-blur-md border border-white/10 shadow-xl">
                <div className="mb-1 text-center text-sm font-bold text-blue-400">
                  {message.nickname}
                </div>
                <div className="text-center text-2xl font-medium text-white break-all">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
