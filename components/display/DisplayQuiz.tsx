"use client";

import { useEffect, useState } from "react";
import { useActiveQuiz } from "@/hooks/useActiveQuiz";
import type { QuizSession, Room } from "@/lib/types";

interface DisplayQuizProps {
  roomId: string;
  room: Room;
}

export default function DisplayQuiz({ roomId, room }: DisplayQuizProps) {
  const { session, ranking, answers } = useActiveQuiz(roomId);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-3xl font-bold text-white animate-pulse">퀴즈 프로젝트 대기 중...</p>
      </div>
    );
  }

  // 통계 계산
  const totalAnswers = answers.length;
  const stats = (session.options as string[] || []).map((_, i) => {
    const count = answers.filter(a => Number(a.answer) === i).length;
    const percent = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
    return { count, percent };
  });

  // 1. 대기/시작 전
  if (room.quiz_phase === "waiting") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8">
        <div className="text-5xl font-bold text-white">곧 퀴즈가 시작됩니다!</div>
        <div className="text-2xl text-blue-400">준비해 주세요...</div>
      </div>
    );
  }

  // 2. 순위 보기 (중간 순위 or 최종 순위)
  if (room.quiz_phase === "ranking") {
    return (
      <div className="flex h-full w-full max-w-4xl flex-col items-center justify-center gap-8 px-8">
        <h2 className="text-5xl font-bold text-amber-400 mb-4">🏆 실시간 랭킹</h2>
        <div className="w-full space-y-3">
          {ranking.map((rank, i) => (
            <div
              key={rank.nickname}
              className={`flex items-center justify-between rounded-2xl border-2 px-8 py-4 transition-all ${
                i === 0 ? "border-amber-400 bg-amber-400/20 scale-105" : 
                i === 1 ? "border-gray-300 bg-gray-300/10" :
                i === 2 ? "border-amber-700 bg-amber-700/10" :
                "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-6">
                <span className={`text-3xl font-black ${
                  i === 0 ? "text-amber-400" : 
                  i === 1 ? "text-gray-300" :
                  i === 2 ? "text-amber-700" :
                  "text-white/40"
                }`}>
                  {i + 1}
                </span>
                <span className="text-2xl font-bold text-white">{rank.nickname}</span>
              </div>
              <div className="text-2xl font-black text-white">
                {rank.correct} <span className="text-sm font-normal text-white/60">점</span>
              </div>
            </div>
          ))}
          {ranking.length === 0 && (
            <div className="text-center text-2xl text-white/40 py-12">아직 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    );
  }

  // 3. 종료됨 (최종 시상대)
  if (room.quiz_phase === "ended") {
    const top3 = ranking.slice(0, 3);
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-12 px-8">
        <h2 className="text-6xl font-black text-white animate-bounce">순위발표 축하합니다</h2>
        
        <div className="flex items-end justify-center gap-4 w-full max-w-5xl h-[400px]">
          {/* 2등 */}
          {top3[1] && (
            <div className="flex flex-col items-center gap-4 w-1/3">
              <div className="text-2xl font-bold text-gray-300">{top3[1].nickname}</div>
              <div className="w-full bg-gradient-to-t from-gray-500/40 to-gray-400/60 rounded-t-3xl border-x-2 border-t-2 border-gray-400/50 flex flex-col items-center justify-end pb-8 h-[250px] shadow-[0_-10px_40px_rgba(156,163,175,0.2)]">
                <div className="text-6xl font-black text-white/80">2</div>
                <div className="text-xl font-bold text-white/60">{top3[1].correct} 점</div>
              </div>
            </div>
          )}

          {/* 1등 */}
          {top3[0] && (
            <div className="flex flex-col items-center gap-4 w-1/3 relative">
              <div className="absolute -top-16 text-6xl animate-bounce">👑</div>
              <div className="text-4xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">{top3[0].nickname}</div>
              <div className="w-full bg-gradient-to-t from-amber-600/40 to-amber-400/60 rounded-t-3xl border-x-4 border-t-4 border-amber-400 flex flex-col items-center justify-end pb-12 h-[350px] shadow-[0_-15px_60px_rgba(251,191,36,0.3)]">
                <div className="text-8xl font-black text-white drop-shadow-lg">1</div>
                <div className="text-2xl font-black text-white">{top3[0].correct} 점</div>
              </div>
            </div>
          )}

          {/* 3등 */}
          {top3[2] && (
            <div className="flex flex-col items-center gap-4 w-1/3">
              <div className="text-xl font-bold text-amber-700">{top3[2].nickname}</div>
              <div className="w-full bg-gradient-to-t from-amber-900/40 to-amber-700/60 rounded-t-3xl border-x-2 border-t-2 border-amber-700/50 flex flex-col items-center justify-end pb-6 h-[180px] shadow-[0_-8px_30px_rgba(180,83,9,0.2)]">
                <div className="text-5xl font-black text-white/70">3</div>
                <div className="text-lg font-bold text-white/50">{top3[2].correct} 점</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. 문제 제출 (question) / 채점 중 (grading) / 정답 공개 (reveal)
  const opts = (session.options as string[]) || [];
  const isReveal = room.quiz_phase === "reveal";
  const isGrading = room.quiz_phase === "grading";

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-start gap-2 px-8 pt-4">
      {/* 헤더 영역: 질문을 중앙에 배치 */}
      <div className="relative flex w-full items-center justify-center py-2">
        <h2 className="text-center text-5xl font-black text-white leading-tight max-w-6xl drop-shadow-2xl">
          {session.question}
        </h2>
      </div>
      
      {session.image_url && (
        <div className="relative flex-1 w-full max-w-[98%] overflow-hidden rounded-[2rem] border-4 border-white/10 bg-black/40 shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
          <img
            src={session.image_url}
            alt="Quiz"
            className="h-full w-full object-contain p-1"
          />
        </div>
      )}

      <div className="relative flex flex-row justify-center gap-4 w-full max-w-[98%] mb-6">
        {/* 채점 중 모래시계 오버레이 (보기 영역만 가림) */}
        {isGrading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-black/70 backdrop-blur-xl border-4 border-blue-500/30">
            <div className="mb-2 text-6xl animate-hourglass">⏳</div>
            <div className="text-3xl font-black text-white drop-shadow-2xl">채점 중...</div>
          </div>
        )}

        {opts.map((opt, i) => {
          const isCorrect = session.correct_answer === i;
          const { count, percent } = stats[i] || { count: 0, percent: 0 };

          return (
            <div
              key={i}
              className={`group relative flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all duration-500 ${
                isReveal
                  ? isCorrect
                    ? "border-green-500 bg-green-500/20 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                    : "border-red-500/30 bg-red-500/5 opacity-40"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-black transition-colors ${
                  isReveal && isCorrect ? "bg-green-500 text-white" : "bg-white/10 text-white group-hover:bg-white/20"
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                
                <div className="flex-1 truncate">
                  <div className="text-xl font-bold text-white truncate text-center">{opt}</div>
                </div>

                {isReveal && isCorrect && (
                  <div className="text-green-500 animate-bounce shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {isReveal && (
                <div className="w-full mt-1">
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isCorrect ? 'bg-green-500' : 'bg-white/30'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-sm font-mono font-bold text-white/80">{count}명 ({percent}%)</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
