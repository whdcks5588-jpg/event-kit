"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Room } from "@/lib/types";

/**
 * 방 정보 + current_program 실시간 구독.
 * Admin/Display/Participant 모두 이 훅으로 동일한 프로그램 상태를 받아 화면 전환.
 */
export function useRoomProgram(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (!error && data) setRoom(data as Room);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`room-program:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, loading };
}
