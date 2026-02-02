"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RaffleSession } from "@/lib/types";

export function useActiveRaffle(roomId: string | undefined) {
  const [session, setSession] = useState<RaffleSession | null>(null);

  useEffect(() => {
    if (!roomId) return;

    async function load() {
      const { data } = await supabase
        .from("raffle_sessions")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setSession(data as RaffleSession);
    }

    load();

    const channel = supabase
      .channel(`raffle:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "raffle_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) setSession(payload.new as RaffleSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { session };
}
