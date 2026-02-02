"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuizSession, QuizAnswer } from "@/lib/types";

export function useActiveQuiz(roomId: string | undefined) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [ranking, setRanking] = useState<{ nickname: string; correct: number }[]>([]);

  useEffect(() => {
    if (!roomId) return;

    async function load() {
      const { data } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("room_id", roomId)
        .in("status", ["waiting", "active", "ended"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setSession(data as QuizSession);
    }

    load();

    const channel = supabase
      .channel(`quiz:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quiz_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) setSession(payload.new as QuizSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!session?.id) {
      setAnswers([]);
      setRanking([]);
      return;
    }

    async function loadAnswers() {
      const { data } = await supabase
        .from("quiz_answers")
        .select("*")
        .eq("session_id", session.id)
        .order("submitted_at", { ascending: true });
      setAnswers((data as QuizAnswer[]) || []);
    }

    loadAnswers();

    const channel = supabase
      .channel(`quiz-answers:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quiz_answers",
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("quiz_answers")
            .select("*")
            .eq("session_id", session.id);
          setAnswers((data as QuizAnswer[]) || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // 랭킹: room 내 모든 퀴즈 세션에서 정답 수 집계 (같은 room_id의 quiz_sessions + quiz_answers)
  useEffect(() => {
    if (!roomId || !session) return;

    async function loadRanking() {
      const { data: sessions } = await supabase
        .from("quiz_sessions")
        .select("id")
        .eq("room_id", roomId)
        .eq("status", "ended");
      if (!sessions?.length) {
        setRanking([]);
        return;
      }
      const ids = sessions.map((s) => s.id);
      const { data: answersData } = await supabase
        .from("quiz_answers")
        .select("nickname, is_correct")
        .in("session_id", ids)
        .eq("is_correct", true);
      const countByNick: Record<string, number> = {};
      (answersData || []).forEach((a: { nickname: string }) => {
        countByNick[a.nickname] = (countByNick[a.nickname] || 0) + 1;
      });
      setRanking(
        Object.entries(countByNick)
          .map(([nickname, correct]) => ({ nickname, correct }))
          .sort((a, b) => b.correct - a.correct)
          .slice(0, 10)
      );
    }

    loadRanking();
  }, [roomId, session?.id, answers]);

  return { session, answers, ranking };
}
