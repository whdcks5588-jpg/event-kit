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
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // 만약 active가 없으면 가장 최근의 ended라도 가져옴 (결과 화면용)
      if (!data) {
        const { data: lastEnded } = await supabase
          .from("quiz_sessions")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "ended")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastEnded) setSession(lastEnded as QuizSession);
      } else {
        setSession(data as QuizSession);
      }
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
          const newSession = payload.new as QuizSession;
          if (newSession && (newSession.status === "active" || newSession.status === "ended")) {
            setSession(newSession);
          }
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

  // 랭킹: 같은 프로젝트 내의 모든 퀴즈 세션에서 점수(배점) 합산
  useEffect(() => {
    if (!roomId || !session?.project_id) return;

    async function loadRanking() {
      // 1. 해당 프로젝트의 모든 퀴즈 세션 가져오기
      const { data: sessions } = await supabase
        .from("quiz_sessions")
        .select("id, points")
        .eq("project_id", session.project_id)
        .eq("status", "ended");

      if (!sessions?.length) {
        setRanking([]);
        return;
      }

      const pointsMap = sessions.reduce((acc, s) => {
        acc[s.id] = s.points || 0;
        return acc;
      }, {} as Record<string, number>);

      const ids = sessions.map((s) => s.id);

      // 2. 정답인 답안들 가져오기
      const { data: answersData } = await supabase
        .from("quiz_answers")
        .select("nickname, session_id, is_correct")
        .in("session_id", ids)
        .eq("is_correct", true);

      // 3. 닉네임별로 배점 합산
      const scoreByNick: Record<string, number> = {};
      (answersData || []).forEach((a) => {
        const p = pointsMap[a.session_id] || 0;
        scoreByNick[a.nickname] = (scoreByNick[a.nickname] || 0) + p;
      });

      setRanking(
        Object.entries(scoreByNick)
          .map(([nickname, correct]) => ({ nickname, correct }))
          .sort((a, b) => b.correct - a.correct)
          .slice(0, 10)
      );
    }

    loadRanking();
  }, [roomId, session?.project_id, session?.id, answers]);

  return { session, answers, ranking };
}
