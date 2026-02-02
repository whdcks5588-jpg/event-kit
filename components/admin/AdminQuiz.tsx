"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveQuiz } from "@/hooks/useActiveQuiz";
import type { QuizSession, QuizAnswer, QuizProject, Room, QuizPhase } from "@/lib/types";

interface AdminQuizProps {
  roomId: string;
}

export default function AdminQuiz({ roomId }: AdminQuizProps) {
  const { session, answers, ranking } = useActiveQuiz(roomId);
  
  // 방 상태 관리
  const [room, setRoom] = useState<Room | null>(null);

  // 프로젝트 관리 상태
  const [projects, setProjects] = useState<QuizProject[]>([]);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  
  // 퀴즈 관리 상태
  const [quizzes, setQuizzes] = useState<QuizSession[]>([]);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 퀴즈 폼 상태
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["1", "2", "3", "4"]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [points, setPoints] = useState(10);
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRoom = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    if (data) setRoom(data as Room);
  }, [roomId]);

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("quiz_projects")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching projects:", error);
      return;
    }
    setProjects(data || []);

    // 각 프로젝트별 퀴즈 수 가져오기
    const { data: countData, error: countError } = await supabase
      .from("quiz_sessions")
      .select("project_id");
    
    if (!countError && countData) {
      const counts: Record<string, number> = {};
      countData.forEach(q => {
        if (q.project_id) {
          counts[q.project_id] = (counts[q.project_id] || 0) + 1;
        }
      });
      setProjectCounts(counts);
    }
  }, [roomId]);

  const fetchQuizzes = useCallback(async (projectId: string) => {
    const { data, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });
    
    if (error) {
      console.error("Error fetching quizzes:", error);
      return;
    }
    setQuizzes((data || []) as unknown as QuizSession[]);
  }, []);

  useEffect(() => {
    fetchRoom();
    fetchProjects();

    // 실시간 방 상태 구독
    const roomChannel = supabase
      .channel(`room-quiz-admin-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    // 실시간 프로젝트 및 세션 구독
    const quizChannel = supabase
      .channel(`quiz-data-admin-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_projects", filter: `room_id=eq.${roomId}` },
        () => {
          fetchProjects();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_sessions", filter: `room_id=eq.${roomId}` },
        () => {
          if (selectedProjectId) fetchQuizzes(selectedProjectId);
          fetchProjects(); // 카운트 갱신용
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(quizChannel);
    };
  }, [roomId, fetchRoom, fetchProjects, fetchQuizzes, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchQuizzes(selectedProjectId);
    }
  }, [selectedProjectId, fetchQuizzes]);

  // 프로젝트 생성
  async function createProject() {
    if (!newProjectTitle.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("quiz_projects")
      .insert({
        room_id: roomId,
        title: newProjectTitle.trim()
      });
    setLoading(false);
    if (error) {
      alert("프로젝트 생성 실패: " + error.message);
    } else {
      setNewProjectTitle("");
      fetchProjects();
    }
  }

  // 프로젝트 삭제
  async function deleteProject(id: string) {
    if (!confirm("정말 이 프로젝트를 삭제하시겠습니까? 관련 퀴즈도 모두 삭제됩니다.")) return;
    const { error } = await supabase
      .from("quiz_projects")
      .delete()
      .eq("id", id);
    if (error) alert("삭제 실패: " + error.message);
    else fetchProjects();
  }

  // 퀴즈 생성/수정
  async function saveQuiz() {
    if ((!question.trim() && !questionImageUrl) || !selectedProjectId) {
      alert("문제 내용 또는 이미지를 입력하세요.");
      return;
    }
    setLoading(true);
    
    const quizData = {
      room_id: roomId,
      project_id: selectedProjectId,
      title: title.trim() || "퀴즈",
      question: question.trim(),
      options,
      question_type: "objective",
      correct_answer: correctIndex,
      points,
      image_url: questionImageUrl,
      status: "waiting",
      order_index: editingQuizId ? undefined : quizzes.length // 새 퀴즈일 때만 순서 부여
    };

    let error;
    if (editingQuizId) {
      const { error: updateError } = await supabase
        .from("quiz_sessions")
        .update(quizData)
        .eq("id", editingQuizId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("quiz_sessions")
        .insert(quizData);
      error = insertError;
    }

    setLoading(false);
    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      resetQuizForm();
      setIsModalOpen(false);
      fetchQuizzes(selectedProjectId);
      fetchProjects(); // 카운트 갱신용
    }
  }

  // 퀴즈 진행 제어 함수들
  async function startProject() {
    if (!selectedProjectId || quizzes.length === 0) return;
    
    if (!confirm("프로젝트를 시작하시겠습니까? 이전 진행 기록과 답안이 모두 초기화됩니다.")) return;

    setLoading(true);
    
    // 퀴즈 상태 초기화
    await supabase
      .from("quiz_sessions")
      .update({ status: "waiting", started_at: null, ended_at: null })
      .eq("project_id", selectedProjectId);

    // 이전 답안 삭제
    const { data: sessIds } = await supabase
      .from("quiz_sessions")
      .select("id")
      .eq("project_id", selectedProjectId);
    
    if (sessIds?.length) {
      await supabase
        .from("quiz_answers")
        .delete()
        .in("session_id", sessIds.map(s => s.id));
    }

    // 첫 번째 퀴즈 활성화 및 방 상태 업데이트
    const firstQuiz = quizzes[0];
    
    await supabase
      .from("rooms")
      .update({
        quiz_project_id: selectedProjectId,
        quiz_phase: "question",
        quiz_current_index: 0,
        current_program: "quiz"
      })
      .eq("id", roomId);

    await supabase
      .from("quiz_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", firstQuiz.id);
    
    setLoading(false);
  }

  async function nextStep() {
    if (!room || !selectedProjectId || loading) return;
    setLoading(true);

    const currentIdx = room.quiz_current_index;
    const currentQuiz = quizzes[currentIdx];

    try {
      if (room.quiz_phase === "question") {
        // 채점 중으로 이동
        await supabase
          .from("rooms")
          .update({ quiz_phase: "grading" })
          .eq("id", roomId);
      } 
      else if (room.quiz_phase === "grading") {
        // 정답 공개로 이동 및 채점 수행
        await supabase
          .from("rooms")
          .update({ quiz_phase: "reveal" })
          .eq("id", roomId);

        // 채점 로직
        if (currentQuiz && currentQuiz.correct_answer !== null) {
          const { data: answerList } = await supabase
            .from("quiz_answers")
            .select("id, answer")
            .eq("session_id", currentQuiz.id);
          
          const updates = (answerList || []).map((a: any) => ({
            id: a.id,
            is_correct: Number(a.answer) === currentQuiz.correct_answer
          }));
          
          // 병렬로 채점 업데이트 (속도 개선)
          if (updates.length > 0) {
            await Promise.all(
              updates.map((u) =>
                supabase.from("quiz_answers").update({ is_correct: u.is_correct }).eq("id", u.id)
              )
            );
          }
        }

        await supabase
          .from("quiz_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", currentQuiz.id);
      } 
      else if (room.quiz_phase === "reveal" || room.quiz_phase === "ranking") {
        // 다음 문제로 이동 또는 종료
        if (currentIdx < quizzes.length - 1) {
          const nextIdx = currentIdx + 1;
          const nextQuiz = quizzes[nextIdx];

          await supabase
            .from("rooms")
            .update({
              quiz_phase: "question",
              quiz_current_index: nextIdx
            })
            .eq("id", roomId);

          await supabase
            .from("quiz_sessions")
            .update({ status: "active", started_at: new Date().toISOString() })
            .eq("id", nextQuiz.id);
        } else {
          // 모든 문제 종료
          await supabase
            .from("rooms")
            .update({ quiz_phase: "ended" })
            .eq("id", roomId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function showRanking() {
    if (!room || !selectedProjectId) return;
    
    // 이미 랭킹 화면(ranking 또는 ended)이면 이전 단계로 돌아가기 (토글)
    if (room.quiz_phase === "ranking" || room.quiz_phase === "ended") {
      const prevPhase = (room as any).quiz_prev_phase || "reveal";
      await supabase
        .from("rooms")
        .update({ quiz_phase: prevPhase })
        .eq("id", roomId);
      return;
    }

    // 랭킹 화면이 아니면 랭킹 보여주기
    // 현재 페이즈를 저장하여 나중에 돌아올 때 사용 (reveal이 아닌 경우에도 대응)
    const currentPhase = room.quiz_phase;
    
    // 마지막 문제까지 완료된 상태인지 확인하여 적절한 페이즈로 이동
    const isLastQuiz = room.quiz_current_index >= quizzes.length - 1;
    const { data: lastQuiz } = await supabase
      .from("quiz_sessions")
      .select("status")
      .eq("id", quizzes[quizzes.length - 1]?.id)
      .single();

    const targetPhase = (isLastQuiz && lastQuiz?.status === "ended") ? "ended" : "ranking";

    await supabase
      .from("rooms")
      .update({ 
        quiz_phase: targetPhase,
        quiz_prev_phase: currentPhase // 이전 페이즈 저장용 필드 (필요시)
      })
      .eq("id", roomId);
  }

  async function resetProject() {
    if (!confirm("퀴즈를 초기화하시겠습니까? 모든 제출된 답안이 삭제될 수 있습니다.")) return;
    
    // 프로젝트 내 모든 퀴즈 상태 초기화
    if (selectedProjectId) {
      await supabase
        .from("quiz_sessions")
        .update({ status: "waiting", started_at: null, ended_at: null })
        .eq("project_id", selectedProjectId);
        
      // 모든 답안 삭제 (선택사항, 여기선 삭제)
      const { data: sessIds } = await supabase
        .from("quiz_sessions")
        .select("id")
        .eq("project_id", selectedProjectId);
      
      if (sessIds?.length) {
        await supabase
          .from("quiz_answers")
          .delete()
          .in("session_id", sessIds.map(s => s.id));
      }
    }

    await supabase
      .from("rooms")
      .update({
        quiz_project_id: null,
        quiz_phase: "waiting",
        quiz_current_index: 0
      })
      .eq("id", roomId);
  }

  function resetQuizForm() {
    setTitle("");
    setQuestion("");
    setOptions(["1", "2", "3", "4"]);
    setCorrectIndex(0);
    setPoints(10);
    setQuestionImageUrl(null);
    setEditingQuizId(null);
  }

  function editQuiz(quiz: QuizSession) {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setQuestion(quiz.question);
    setOptions(quiz.options);
    setCorrectIndex(quiz.correct_answer || 0);
    setPoints(quiz.points);
    setQuestionImageUrl(quiz.image_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteQuiz(id: string) {
    if (!confirm("이 퀴즈를 삭제하시겠습니까?")) return;
    const { error } = await supabase
      .from("quiz_sessions")
      .delete()
      .eq("id", id);
    if (error) alert("삭제 실패: " + error.message);
    else if (selectedProjectId) fetchQuizzes(selectedProjectId);
  }

  async function moveQuiz(id: string, direction: 'up' | 'down') {
    const currentIndex = quizzes.findIndex(q => q.id === id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === quizzes.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentQuiz = quizzes[currentIndex];
    const targetQuiz = quizzes[targetIndex];

    // 순서 교체
    const { error: err1 } = await supabase
      .from("quiz_sessions")
      .update({ order_index: targetIndex })
      .eq("id", currentQuiz.id);
    
    const { error: err2 } = await supabase
      .from("quiz_sessions")
      .update({ order_index: currentIndex })
      .eq("id", targetQuiz.id);

    if (err1 || err2) alert("순서 변경 실패");
    else if (selectedProjectId) fetchQuizzes(selectedProjectId);
  }

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
      alert("이미지 업로드 실패");
      return null;
    }
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

  // 데이터 삭제 로직
  async function handleResetRecords() {
    // 이 함수는 필요에 따라 남겨두거나 제거할 수 있지만, 
    // 사용자가 요청한 '상단 헤더' 이동과는 별개로 
    // 프로젝트별 초기화 기능은 유지하는 것이 좋을 수 있습니다.
  }

  const currentSession = session?.status === "active" || session?.status === "waiting" ? session : null;

  // 프로젝트 리스트 화면
  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">퀴즈 프로젝트 관리</h2>
        </div>

        {/* 새 프로젝트 생성 */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h3 className="mb-4 font-semibold text-white">새 프로젝트 생성</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="프로젝트 이름을 입력하세요"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={createProject}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              생성
            </button>
          </div>
        </div>

        {/* 프로젝트 리스트 */}
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const isActive = room?.quiz_project_id === project.id;
            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-6 transition-all hover:shadow-xl ${
                  isActive 
                    ? "border-green-500 bg-green-900/10 ring-1 ring-green-500" 
                    : "border-gray-700 bg-gray-800 hover:border-blue-500/50"
                }`}
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-bold text-white">{project.title}</h4>
                    {isActive && (
                      <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
                        진행 중
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    퀴즈 항목: {projectCounts[project.id] || 0}개
                  </p>
                </div>
                <div className="flex gap-2">
                  <div
                    className={`flex-1 text-center rounded-lg py-2 text-sm font-semibold text-white transition-colors ${
                      isActive ? "bg-green-600 group-hover:bg-green-700" : "bg-gray-700 group-hover:bg-gray-600"
                    }`}
                  >
                    퀴즈 관리
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="rounded-lg bg-red-900/30 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-900/50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              생성된 퀴즈 프로젝트가 없습니다.
            </div>
          )}
        </div>
      </div>
    );
  }

  // 개별 프로젝트 내 퀴즈 관리 화면
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isProjectRunning = room?.quiz_project_id === selectedProjectId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedProjectId(null);
              resetQuizForm();
            }}
            className="rounded-lg bg-gray-700 p-2 text-gray-300 hover:bg-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-white">{selectedProject?.title}</h2>
        </div>
        <div className="flex gap-2">
          {!isProjectRunning ? (
            <button
              onClick={startProject}
              className="rounded-lg bg-green-600 px-6 py-2 font-bold text-white hover:bg-green-700"
            >
              퀴즈 시작하기
            </button>
          ) : (
            <>
              <button
                onClick={nextStep}
                className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
              >
                {room?.quiz_phase === "question" ? "다음 (채점하기)" : 
                 room?.quiz_phase === "grading" ? "다음 (정답공개)" : 
                 room?.quiz_phase === "reveal" ? (room.quiz_current_index < quizzes.length - 1 ? "다음 문제로" : "최종 결과 보기") :
                 room?.quiz_phase === "ranking" ? (room.quiz_current_index < quizzes.length - 1 ? "다음 문제로" : "최종 결과 보기") :
                 "다음 단계"}
              </button>
              <button
                onClick={showRanking}
                className={`rounded-lg px-6 py-2 font-bold text-white transition-colors ${
                  (room?.quiz_phase === "ranking" || room?.quiz_phase === "ended") ? "bg-amber-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {(room?.quiz_phase === "ranking" || room?.quiz_phase === "ended") ? "순위 닫기" : "점수 확인"}
              </button>
              <button
                onClick={resetProject}
                className="rounded-lg bg-red-900/50 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-900/80"
              >
                초기화
              </button>
            </>
          )}
        </div>
      </div>

      {/* 퀴즈 진행 상태 표시 */}
      {isProjectRunning && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-900/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 font-bold">
              진행 중: {room.quiz_current_index + 1} / {quizzes.length}번 문제
            </span>
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
              상태: {
                room.quiz_phase === "question" ? "문제 제출 중" :
                room.quiz_phase === "grading" ? "채점 중" :
                room.quiz_phase === "reveal" ? "정답 공개" :
                room.quiz_phase === "ranking" ? "순위 확인" :
                room.quiz_phase === "ended" ? "종료됨" : "대기 중"
              }
            </span>
          </div>
        </div>
      )}

      {/* 퀴즈 생성 버튼 */}
      <button
        onClick={() => {
          resetQuizForm();
          setIsModalOpen(true);
        }}
        className="w-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 py-4 font-bold text-gray-400 transition-all hover:border-blue-500 hover:text-blue-400"
      >
        + 새 퀴즈 만들기
      </button>

      {/* 퀴즈 리스트 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">퀴즈 리스트 ({quizzes.length})</h3>
          {room?.quiz_phase === "ranking" && (
            <span className="animate-pulse rounded-full bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-500">
              현재 순위 표시 중
            </span>
          )}
        </div>

        {room?.quiz_phase === "ranking" || room?.quiz_phase === "ended" ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-6">
            <h4 className="mb-4 font-bold text-amber-400">현재 Top 10 랭킹</h4>
            <div className="space-y-2">
              {ranking.map((rank, i) => (
                <div key={rank.nickname} className="flex items-center justify-between rounded-lg bg-black/20 p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-amber-500 w-6">{i + 1}</span>
                    <span className="font-bold text-white">{rank.nickname}</span>
                  </div>
                  <span className="font-mono text-white">{rank.correct} 점</span>
                </div>
              ))}
              {ranking.length === 0 && (
                <div className="py-8 text-center text-gray-500">데이터가 없습니다.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {quizzes.map((q, index) => (
              <div
                key={q.id}
                className={`group flex items-center gap-4 rounded-xl border p-4 transition-all ${
                  isProjectRunning && room.quiz_current_index === index
                    ? "border-blue-500 bg-blue-900/20 ring-1 ring-blue-500"
                    : "border-gray-700 bg-gray-800"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 font-bold text-white">
                  {index + 1}
                </div>
                
                {q.image_url && (
                  <img src={q.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover bg-gray-900 border border-gray-700" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{q.question || "(텍스트 없음)"}</span>
                    <span className="shrink-0 rounded bg-gray-700 px-2 py-0.5 text-xs text-blue-400">{q.points}점</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-green-400">정답: {q.options[q.correct_answer || 0]}</span>
                    <span className="text-gray-600">|</span>
                    <span className="truncate">선택지: {q.options.join(", ")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveQuiz(q.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveQuiz(q.id, 'down')}
                    disabled={index === quizzes.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      editQuiz(q);
                      setIsModalOpen(true);
                    }}
                    className="p-1 text-blue-400 hover:text-blue-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteQuiz(q.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {quizzes.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                추가된 퀴즈가 없습니다. 퀴즈를 먼저 만들어주세요.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 퀴즈 생성/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-white">
              {editingQuizId ? "퀴즈 수정" : "새 퀴즈 만들기"}
            </h3>
            
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">퀴즈 제목 (관리용)</label>
                  <input
                    type="text"
                    placeholder="예: 1번 문제"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">배점</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">퀴즈 내용</label>
                <textarea
                  placeholder="퀴즈 내용을 입력하세요"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-400">선택지 및 정답 (정답 선택 시 초록색 표시)</label>
                <div className="grid gap-3">
                  {options.map((opt, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-3 rounded-lg border p-1 transition-colors ${
                        correctIndex === i ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-800"
                      }`}
                    >
                      <button
                        onClick={() => setCorrectIndex(i)}
                        className={`h-8 w-12 shrink-0 rounded font-bold transition-colors ${
                          correctIndex === i ? "bg-green-500 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        정답
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...options];
                          next[i] = e.target.value;
                          setOptions(next);
                        }}
                        placeholder={`선택지 ${i + 1}`}
                        className="flex-1 bg-transparent px-2 py-2 text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">문제 이미지 (내용과 이미지 중 하나는 필수)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadImage(file);
                      if (url) setQuestionImageUrl(url);
                    }}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-600"
                  />
                  {questionImageUrl && (
                    <button onClick={() => setQuestionImageUrl(null)} className="text-red-400 hover:text-red-300">삭제</button>
                  )}
                </div>
                {questionImageUrl && (
                  <img src={questionImageUrl} alt="Preview" className="mt-2 h-32 w-auto rounded-lg object-contain border border-gray-700" />
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveQuiz}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "저장 중..." : editingQuizId ? "퀴즈 수정 완료" : "퀴즈 추가하기"}
                </button>
                <button
                  onClick={() => {
                    resetQuizForm();
                    setIsModalOpen(false);
                  }}
                  className="rounded-lg bg-gray-700 px-8 py-3 font-bold text-white hover:bg-gray-600"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
