"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Room, Participant, Message } from "@/lib/types";
import AdminView from "@/components/AdminView";

export default function AdminPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();

    // 참가자 실시간 구독
    const participantsChannel = supabase
      .channel(`admin-participants:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log("Participant event:", payload.eventType);
          if (payload.eventType === "INSERT") {
            const participant = payload.new as Participant;
            setParticipants((prev) => {
              if (prev.some((p) => p.id === participant.id)) {
                return prev;
              }
              return [participant, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const participant = payload.new as Participant;
            setParticipants((prev) =>
              prev.map((p) => (p.id === participant.id ? participant : p))
            );
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== payload.old.id)
            );
          } else {
            // 기타 이벤트는 전체 새로고침
            const { data } = await supabase
              .from("participants")
              .select("*")
              .eq("room_id", roomId)
              .order("created_at", { ascending: false });
            if (data) setParticipants(data as Participant[]);
          }
        }
      )
      .subscribe((status) => {
        console.log("Participants channel status:", status);
      });

    // 메시지 실시간 구독
    const messagesChannel = supabase
      .channel(`admin-messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log("Message event:", payload.eventType);
          if (payload.eventType === "INSERT") {
            const message = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === message.id)) {
                return prev;
              }
              return [message, ...prev].slice(0, 100);
            });
          } else if (payload.eventType === "UPDATE") {
            const message = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === message.id ? message : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          } else {
            // 기타 이벤트는 전체 새로고침
            const { data } = await supabase
              .from("messages")
              .select("*")
              .eq("room_id", roomId)
              .order("created_at", { ascending: false })
              .limit(100);
            if (data) setMessages(data as Message[]);
          }
        }
      )
      .subscribe((status) => {
        console.log("Messages channel status:", status);
      });

    // 방 상태 실시간 구독
    const roomChannel = supabase
      .channel(`admin-room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Room event:", payload.eventType);
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  async function loadData() {
    const [roomRes, participantsRes, messagesRes] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).single(),
      supabase
        .from("participants")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (roomRes.data) setRoom(roomRes.data as Room);
    if (participantsRes.data)
      setParticipants(participantsRes.data as Participant[]);
    if (messagesRes.data) setMessages(messagesRes.data as Message[]);

    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-lg text-white">로딩 중...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-lg text-red-500">방을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <AdminView
      room={room}
      roomId={roomId}
      participants={participants}
      messages={messages}
      onRoomUpdate={loadData}
    />
  );
}
