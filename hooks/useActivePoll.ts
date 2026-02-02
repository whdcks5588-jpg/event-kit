"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PollSession, PollVote } from "@/lib/types";

export function useActivePoll(roomId: string | undefined) {
  const [session, setSession] = useState<PollSession | null>(null);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [counts, setCounts] = useState<number[]>([]);

  useEffect(() => {
    if (!roomId) return;

    async function load() {
      const { data } = await supabase
        .from("poll_sessions")
        .select("*")
        .eq("room_id", roomId)
        .in("status", ["waiting", "active", "ended"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setSession(data as PollSession);
    }

    load();

    const channel = supabase
      .channel(`poll:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) setSession(payload.new as PollSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!session?.id) {
      setVotes([]);
      setCounts([]);
      return;
    }

    async function loadVotes() {
      const { data } = await supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", session.id);
      const list = (data as PollVote[]) || [];
      setVotes(list);
      const opts = (session.options as string[]) || [];
      setCounts(opts.map((_, i) => list.filter((v) => v.option_index === i).length));
    }

    loadVotes();

    const channel = supabase
      .channel(`poll-votes:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${session.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("poll_votes")
            .select("*")
            .eq("poll_id", session.id);
          setVotes((data as PollVote[]) || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // counts 재계산 (votes 또는 session.options 변경 시)
  useEffect(() => {
    if (!session?.options) {
      setCounts([]);
      return;
    }
    const opts = session.options as string[];
    setCounts(opts.map((_, i) => votes.filter((v) => v.option_index === i).length));
  }, [session?.options, session?.id, votes]);

  return { session, votes, counts };
}
