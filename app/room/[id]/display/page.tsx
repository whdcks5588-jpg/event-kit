"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getRoomUrl } from "@/lib/utils";
import type { Room, Participant, Message } from "@/lib/types";
import QRCode from "qrcode";
import DisplayView from "@/components/DisplayView";

export default function DisplayPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    loadRoom();
    generateQRCode();
    loadParticipantCount();

    // 참가자 실시간 구독
    const participantsChannel = supabase
      .channel(`display-participants:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log("Display participant event:", payload.eventType);
          // 참가자 수 재계산
          const { count, error } = await supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("room_id", roomId)
            .eq("is_active", true);

          if (!error && count !== null) {
            setParticipantCount(count);
          }
        }
      )
      .subscribe((status) => {
        console.log("Display participants channel status:", status);
      });

    return () => {
      supabase.removeChannel(participantsChannel);
    };
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

  async function generateQRCode() {
    const url = getRoomUrl(roomId);
    try {
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
      });
      setQrCodeUrl(qr);
    } catch (error) {
      console.error("QR code generation error:", error);
    }
  }

  async function loadParticipantCount() {
    const { count, error } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("is_active", true);

    if (error) {
      console.error("Participant count error:", error);
      return;
    }

    setParticipantCount(count || 0);
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-lg text-white">로딩 중...</div>
      </div>
    );
  }

  return (
    <DisplayView
      room={room}
      roomId={roomId}
      qrCodeUrl={qrCodeUrl}
      participantCount={participantCount}
    />
  );
}
