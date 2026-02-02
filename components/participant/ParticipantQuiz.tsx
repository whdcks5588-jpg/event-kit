"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveQuiz } from "@/hooks/useActiveQuiz";
import type { Participant, Room } from "@/lib/types";

interface ParticipantQuizProps {
  roomId: string;
  participant: Participant;
  room: Room;
}

export default function ParticipantQuiz({ roomId, participant, room }: ParticipantQuizProps) {
  const { session, ranking } = useActiveQuiz(roomId);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showRankingOverlay, setShowRankingOverlay] = useState(false);

  // 문제 인덱스가 바뀌면 제출 상태 초기화
  useEffect(() => {
    setSubmitted(false);
    setSelectedOption(null);
    setShowRankingOverlay(false);
  }, [room.quiz_current_index]);

  // 이미 제출했는지 확인
  useEffect(() => {
    if (session?.id) {
      const sessionId = session.id;
      async function checkSubmission() {
        const { data } = await supabase
          .from("quiz_answers")
          .select("answer")
          .eq("session_id", sessionId)
          .eq("participant_id", participant.id)
          .maybeSingle();
        
        if (data) {
          setSubmitted(true);
          setSelectedOption(Number(data.answer));
        } else {
          // 데이터가 없으면 상태 초기화 (버그 방지)
          setSubmitted(false);
          setSelectedOption(null);
        }
      }
      checkSubmission();
    }
  }, [session?.id, participant.id]);

  async function submitAnswer(optionIndex: number) {
    if (!session || room.quiz_phase !== "question" || submitted || submitting) return;
    
    const optionLabel = String.fromCharCode(65 + optionIndex);
    if (!window.confirm(`정답 ${optionLabel}번을 선택하시겠습니까?`)) return;

    setSubmitting(true);
    setSelectedOption(optionIndex);
    
    const { error } = await supabase.from("quiz_answers").insert({
      session_id: session.id,
      participant_id: participant.id,
      nickname: participant.nickname,
      answer: optionIndex,
      is_correct: null,
    });
    
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") setSubmitted(true);
      else alert("제출 실패: " + error.message);
      return;
    }
    setSubmitted(true);
  }

  if (!session) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 h-12 w-12 animate-pulse rounded-full bg-blue-600/20"></div>
        <p className="text-xl font-bold text-white">퀴즈 대기 중...</p>
        <p className="mt-2 text-gray-500">관리자가 퀴즈를 시작할 때까지 잠시만 기다려주세요.</p>
      </div>
    );
  }

  // 1. 대기 중
  if (room.quiz_phase === "waiting") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 text-6xl">⏳</div>
        <h3 className="text-2xl font-bold text-white">준비하세요!</h3>
        <p className="mt-2 text-gray-400">곧 첫 번째 문제가 공개됩니다.</p>
      </div>
    );
  }

  // 2. 채점 중 (제거됨 - 문제 화면 유지)
  // if (room.quiz_phase === "grading") { ... }

  // 3. 순위 확인 / 종료 (관리자가 강제로 보여줄 때도 오버레이로 처리하기 위해 null 반환하지 않음)
  // if (room.quiz_phase === "ranking" || room.quiz_phase === "ended") { ... }

  // 4. 문제 풀이 (question) / 정답 공개 (reveal) / 채점 중 (grading)
  const opts = (session.options as string[]) || [];
  const isReveal = room.quiz_phase === "reveal";
  const isGrading = room.quiz_phase === "grading";
  const isRankingMode = room.quiz_phase === "ranking" || room.quiz_phase === "ended" || showRankingOverlay;

  return (
    <div className="relative flex flex-col gap-6 p-4 min-h-[400px]">
      {/* 순위 확인 오버레이 (기존 코드 유지) */}
      {isRankingMode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-md p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white">
              {room.quiz_phase === "ended" ? "최종 순위" : "실시간 순위"}
            </h3>
            <button
              onClick={() => setShowRankingOverlay(false)}
              className="rounded-full bg-gray-800 p-2 text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {ranking.map((rank, i) => (
              <div 
                key={rank.nickname} 
                className={`flex items-center justify-between rounded-xl p-4 ${
                  rank.nickname === participant.nickname 
                    ? "bg-blue-600/20 border border-blue-500/50 ring-1 ring-blue-500/30" 
                    : "bg-gray-800/50 border border-gray-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                    i === 0 ? "bg-amber-500 text-white" :
                    i === 1 ? "bg-gray-400 text-white" :
                    i === 2 ? "bg-amber-700 text-white" : "bg-gray-700 text-gray-400"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`font-bold ${rank.nickname === participant.nickname ? "text-blue-400" : "text-white"}`}>
                    {rank.nickname} {rank.nickname === participant.nickname && "(나)"}
                  </span>
                </div>
                <span className="font-mono font-bold text-white">{rank.correct} 점</span>
              </div>
            ))}
            {ranking.length === 0 && (
              <div className="py-20 text-center text-gray-500">순위 데이터가 아직 없습니다.</div>
            )}
          </div>
          
          <button
            onClick={() => setShowRankingOverlay(false)}
            className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            돌아가기
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-600/20 px-3 py-1 text-sm font-bold text-blue-400">
            문제 {room.quiz_current_index + 1}
          </span>
          {submitted && !isReveal && !isGrading && (
            <div className="flex items-center gap-2">
              <div className="text-xl animate-bounce">⏳</div>
              <span className="text-sm font-bold text-blue-400">제출 완료!</span>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold text-white leading-tight">{session.question}</h3>
      
      {session.image_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-800 bg-black shadow-lg">
          <img
            src={session.image_url}
            alt="Quiz"
            className="h-full w-full object-contain"
          />
        </div>
      )}

      <div className="relative flex flex-col gap-3">
        {/* 채점 중 모래시계 오버레이 (보기 버튼 영역만 가림) */}
        {isGrading && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-xl bg-gray-900/80 backdrop-blur-[2px] border-2 border-blue-500/30">
            <div className="mb-2 text-6xl animate-hourglass">⏳</div>
            <div className="text-lg font-black text-blue-400">채점 중...</div>
          </div>
        )}

        {opts.map((opt, i) => {
          const isSelected = selectedOption === i;
          const isCorrect = session.correct_answer === i;
          
          let buttonClass = "rounded-xl border-2 p-4 text-left transition-all duration-300 ";
          if (isReveal) {
            if (isCorrect) buttonClass += "border-green-500 bg-green-500/20 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]";
            else if (isSelected) buttonClass += "border-red-500 bg-red-500/20 text-white opacity-60";
            else buttonClass += "border-gray-800 bg-gray-900 text-gray-500 opacity-40";
          } else {
            if (isSelected) buttonClass += "border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/50";
            else buttonClass += "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500";
          }

          return (
            <button
              key={i}
              onClick={() => submitAnswer(i)}
              disabled={submitted || isReveal || submitting}
              className={buttonClass}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black ${
                  isSelected ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-400"
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-bold">{opt}</span>
                {isReveal && isCorrect && <span className="ml-auto text-xl">✅</span>}
                {isReveal && isSelected && !isCorrect && <span className="ml-auto text-xl">❌</span>}
              </div>
            </button>
          );
        })}
      </div>

      {isReveal && (
        <div className={`rounded-xl p-4 text-center font-bold ${
          selectedOption === session.correct_answer 
            ? "bg-green-500/10 text-green-400" 
            : "bg-red-500/10 text-red-400"
        }`}>
          {selectedOption === session.correct_answer 
            ? "정답입니다! 🎉" 
            : selectedOption === null 
              ? "시간이 초과되었습니다." 
              : "아쉽게도 틀렸습니다. 😢"}
        </div>
      )}
    </div>
  );
}
