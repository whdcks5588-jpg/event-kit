"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuizSession, QuizAnswer } from "@/lib/types";
import { useActiveQuiz } from "@/hooks/useActiveQuiz";

interface AdminQuizProps {
  roomId: string;
}

export default function AdminQuiz({ roomId }: AdminQuizProps) {
  const { session, answers, ranking } = useActiveQuiz(roomId);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(30);
  const [creating, setCreating] = useState(false);
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null);

  async function uploadImage(file: File) {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("quiz-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("quiz-images")
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error("Image upload error:", error);
      let message = error.message;
      if (message.includes("Bucket not found")) {
        message += "\n\n해결 방법:\n1. Supabase 콘솔에 접속\n2. Storage > 버킷 생성 > 'quiz-images' 입력\n3. 공개 접근 권한 설정";
      }
      alert("이미지 업로드 실패: " + message);
      return null;
    }
  }

  async function createSession() {
    if (!question.trim() || options.filter(Boolean).length < 2) {
      alert("문제와 선택지 2개 이상을 입력하세요.");
      return;
    }
    setCreating(true);
    const opts = options.filter(Boolean);
    const { data, error } = await supabase
      .from("quiz_sessions")
      .insert({
        room_id: roomId,
        title: title.trim() || "퀴즈",
        question: question.trim(),
        options: opts,
        question_type: "objective",
        correct_answer: correctIndex >= 0 && correctIndex < opts.length ? correctIndex : 0,
        time_limit_seconds: timeLimit,
        status: "waiting",
        image_url: questionImageUrl,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      alert("퀴즈 생성 실패: " + error.message);
      return;
    }
    setTitle("");
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setQuestionImageUrl(null);
  }


  async function startQuiz(sessionId: string) {
    await supabase
      .from("quiz_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  async function endQuiz(sessionId: string) {
    const sess = session;
    if (!sess || sess.correct_answer == null) return;
    const correctIdx = sess.correct_answer as number;
    const { data: answerList } = await supabase
      .from("quiz_answers")
      .select("id, answer")
      .eq("session_id", sessionId);
    const updates = (answerList || []).map((a: { id: string; answer: unknown }) => {
      const ans = typeof a.answer === "number" ? a.answer : -1;
      return { id: a.id, is_correct: ans === correctIdx };
    });
    for (const u of updates) {
      await supabase.from("quiz_answers").update({ is_correct: u.is_correct }).eq("id", u.id);
    }
    await supabase
      .from("quiz_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  const opts = options.filter(Boolean);
  const currentSession = session?.status === "active" || session?.status === "waiting" ? session : null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">퀴즈 관리</h2>

      {/* 랭킹 */}
      {ranking.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <h3 className="mb-2 font-semibold text-white">🏆 랭킹</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            {ranking.slice(0, 10).map((r, i) => (
              <li key={r.nickname + i}>
                {r.nickname} - {r.correct}점
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 현재 세션 */}
      {currentSession && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <p className="text-gray-300">{currentSession.question}</p>
          <p className="mt-2 text-sm text-gray-500">
            상태: {currentSession.status} · 제출 {answers.length}명
          </p>
          {currentSession.status === "waiting" && (
            <button
              onClick={() => startQuiz(currentSession.id)}
              className="mt-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              퀴즈 시작
            </button>
          )}
          {currentSession.status === "active" && (
            <button
              onClick={() => endQuiz(currentSession.id)}
              className="mt-2 rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            >
              종료 및 채점
            </button>
          )}
        </div>
      )}

      {/* 새 퀴즈 만들기 */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-3 font-semibold text-white">새 퀴즈</h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="제목 (선택)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          />
          <textarea
            placeholder="문제"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
            rows={2}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-400">문제 이미지 (선택)</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImage(file);
                  if (url) setQuestionImageUrl(url);
                  event.currentTarget.value = "";
                }}
                className="block w-full text-sm text-gray-400 file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-600"
              />
              {questionImageUrl && (
                <button
                  onClick={() => setQuestionImageUrl(null)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  삭제
                </button>
              )}
            </div>
            {questionImageUrl && (
              <div className="relative mt-2 aspect-video w-full max-w-xs overflow-hidden rounded border border-gray-700">
                <img
                  src={questionImageUrl}
                  alt="Quiz Preview"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>

          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="h-4 w-4"
              />
              <input
                type="text"
                placeholder={`선택지 ${i + 1}`}
                value={options[i] ?? ""}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                className="flex-1 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-gray-400">
            제한 시간(초):
            <input
              type="number"
              min={5}
              max={120}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-20 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-white"
            />
          </label>
        </div>
        <button
          onClick={createSession}
          disabled={creating || !!currentSession}
          className="mt-3 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "생성 중..." : "퀴즈 만들기"}
        </button>
      </div>
    </div>
  );
}
