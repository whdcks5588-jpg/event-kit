"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Room, Participant, Message } from "@/lib/types";
import AdminQuiz from "./admin/AdminQuiz";
import AdminRaffle from "./admin/AdminRaffle";
import AdminPoll from "./admin/AdminPoll";

interface AdminViewProps {
  room: Room;
  roomId: string;
  participants: Participant[];
  messages: Message[];
  onRoomUpdate: () => void;
}

export default function AdminView({
  room,
  roomId,
  participants,
  messages,
  onRoomUpdate,
}: AdminViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"messages" | "control">(
    "control"
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string>(
    room.current_program || "chat"
  );
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editTitle, setEditTitle] = useState(room.title);
  const [editLogoUrl, setEditLogoUrl] = useState(room.logo_url || "");

  // 기록 삭제 관련 상태
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteOptions, setDeleteOptions] = useState({
    chat: false,
    quiz: false
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // room.current_program이 변경되면 selectedProgram도 업데이트
  useEffect(() => {
    if (room.current_program) {
      setSelectedProgram(room.current_program);
    }
  }, [room.current_program]);

  useEffect(() => {
    setEditTitle(room.title);
    setEditLogoUrl(room.logo_url || "");
  }, [room]);

  async function handleUpdateRoomSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsUpdatingRoom(true);
    const { error } = await supabase
      .from("rooms")
      .update({
        title: editTitle,
        logo_url: editLogoUrl || null,
      })
      .eq("id", roomId);

    setIsUpdatingRoom(false);
    if (error) {
      alert("방 설정 업데이트에 실패했습니다.");
    } else {
      alert("방 설정이 저장되었습니다.");
      onRoomUpdate();
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${roomId}-${Math.random()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, file);

    if (uploadError) {
      alert("이미지 업로드에 실패했습니다.");
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("logos")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("rooms")
      .update({ logo_url: publicUrl })
      .eq("id", roomId);

    setIsUploading(false);
    if (updateError) {
      alert("로고 정보 업데이트에 실패했습니다.");
    } else {
      setEditLogoUrl(publicUrl);
      onRoomUpdate();
    }
  }

  async function handleRemoveLogo() {
    if (!confirm("로고를 삭제하시겠습니까?")) return;

    setIsUploading(true);
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ logo_url: null })
      .eq("id", roomId);

    setIsUploading(false);
    if (updateError) {
      alert("로고 삭제에 실패했습니다.");
    } else {
      setEditLogoUrl("");
      onRoomUpdate();
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!confirm("이 메시지를 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_blocked: true })
      .eq("id", messageId);

    if (error) {
      console.error("Delete message error:", error);
      alert("메시지 삭제에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }

  async function handleBlockParticipant(participantId: string) {
    if (!confirm("이 참가자를 차단하시겠습니까?")) return;

    const { error } = await supabase
      .from("participants")
      .update({ is_active: false })
      .eq("id", participantId);

    if (error) {
      console.error("Block participant error:", error);
      alert("참가자 차단에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }

  async function handleChangeProgram(program: string) {
    const { error } = await supabase
      .from("rooms")
      .update({ current_program: program })
      .eq("id", roomId);

    if (error) {
      console.error("Change program error:", error);
      alert("프로그램 변경에 실패했습니다.");
      return;
    }

    setSelectedProgram(program);
    onRoomUpdate();
  }

  async function handleToggleRoomStatus() {
    const newStatus = room.status === "active" ? "waiting" : "active";
    const { error } = await supabase
      .from("rooms")
      .update({ status: newStatus })
      .eq("id", roomId);

    if (error) {
      console.error("Toggle status error:", error);
      alert("상태 변경에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }

  async function handleToggleQrOnly() {
    const { error } = await supabase
      .from("rooms")
      .update({ room_show_qr_only: !room.room_show_qr_only })
      .eq("id", roomId);

    if (error) {
      alert("QR 설정 변경에 실패했습니다.");
      return;
    }
    onRoomUpdate();
  }

  async function handleToggleLogoOnly() {
    const { error } = await supabase
      .from("rooms")
      .update({ room_show_logo_only: !room.room_show_logo_only })
      .eq("id", roomId);

    if (error) {
      console.error("Toggle logo error:", error);
      alert("로고 설정 변경에 실패했습니다.");
      return;
    }

    onRoomUpdate();
  }

  async function handleDeleteRecords() {
    if (!deleteOptions.chat && !deleteOptions.quiz) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    const confirmMsg = `${deleteOptions.chat ? "채팅" : ""} ${deleteOptions.chat && deleteOptions.quiz ? "및 " : ""} ${deleteOptions.quiz ? "퀴즈(프로젝트, 관리내용, 이미지 포함)" : ""} 기록을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
    if (!confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      if (deleteOptions.chat) {
        // 채팅 삭제
        const { error: chatError } = await supabase
          .from("messages")
          .delete()
          .eq("room_id", roomId);
        if (chatError) throw chatError;
      }

      if (deleteOptions.quiz) {
        // 퀴즈 데이터 삭제
        const { data: projectIds } = await supabase
          .from("quiz_projects")
          .select("id")
          .eq("room_id", roomId);
        
        if (projectIds && projectIds.length > 0) {
          const ids = projectIds.map(p => p.id);
          
          const { data: sessionIds } = await supabase
            .from("quiz_sessions")
            .select("id")
            .in("project_id", ids);
            
          if (sessionIds && sessionIds.length > 0) {
            const sIds = sessionIds.map(s => s.id);
            await supabase.from("quiz_answers").delete().in("session_id", sIds);
            await supabase.from("quiz_sessions").delete().in("project_id", ids);
          }
          
          const { error: projectError } = await supabase
            .from("quiz_projects")
            .delete()
            .eq("room_id", roomId);
          if (projectError) throw projectError;
        }

        // 방 상태 초기화
        await supabase
          .from("rooms")
          .update({
            quiz_project_id: null,
            quiz_phase: "waiting",
            quiz_current_index: 0,
            quiz_prev_phase: null
          })
          .eq("id", roomId);
      }

      alert("삭제가 완료되었습니다.");
      setIsDeleteModalOpen(false);
      setDeleteOptions({ chat: false, quiz: false });
      onRoomUpdate();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg bg-gray-700 p-2 text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
              title="대시보드로 돌아가기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">{room.title}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                room.status === "active"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {room.status === "active" ? "진행 중" : "대기 중"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleQrOnly}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                room.room_show_qr_only
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              {room.room_show_qr_only ? "QR 전체화면 끄기" : "QR 전체화면 켜기"}
            </button>
            <button
              onClick={handleToggleLogoOnly}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                room.room_show_logo_only
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              {room.room_show_logo_only ? "로고 전체화면 끄기" : "행사로고출력"}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-600"
            >
              방 설정
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 shadow-lg shadow-red-900/20"
            >
              기록 삭제
            </button>
            <a
              href={`/room/${roomId}/display`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              디스플레이 열기
            </a>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-6">
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[360px_1fr]">
          {/* 왼쪽 컬럼: 디스플레이/참가자 프리뷰 & 채팅 모니터링 */}
          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-2">
            {/* 디스플레이 화면 프리뷰 */}
            <div className="rounded-lg border border-gray-800 bg-gray-800 overflow-hidden">
              <div className="border-b border-gray-700 bg-gray-700/50 px-4 py-2 text-sm font-semibold text-gray-300">
                디스플레이 화면 프리뷰
              </div>
              <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
                <iframe
                  title="display-preview"
                  src={`/room/${roomId}/display`}
                  className="absolute left-0 top-0 h-[400%] w-[400%] origin-top-left"
                  style={{ transform: 'scale(0.25)' }}
                />
              </div>
            </div>

            {/* 참가자 프리뷰 */}
            <div className="rounded-lg border border-gray-800 bg-gray-800 overflow-hidden">
              <div className="border-b border-gray-700 bg-gray-700/50 px-4 py-2 text-sm font-semibold text-gray-300">
                참가자 화면 프리뷰
              </div>
              <div className="relative aspect-[9/16] w-full overflow-hidden bg-gray-900">
                <iframe
                  title="participant-preview"
                  src={`/room/${roomId}`}
                  className="absolute left-0 top-0 h-[300%] w-[300%] origin-top-left"
                  style={{ transform: 'scale(0.333333)' }}
                />
              </div>
            </div>

            {/* 실시간 채팅 모니터링 */}
            <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-800 bg-gray-800">
              <div className="border-b border-gray-700 bg-gray-700/50 px-4 py-2 text-sm font-semibold text-gray-300">
                실시간 채팅 ({messages.length})
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">메시지가 없습니다.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="group relative rounded bg-gray-900/50 p-3 mx-auto w-full max-w-[90%]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-blue-400 text-sm">{message.nickname}</span>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity"
                        >
                          삭제
                        </button>
                      </div>
                      <p className="text-sm text-gray-300 break-all">{message.content}</p>
                      {message.is_blocked && (
                        <div className="mt-1 text-[10px] text-red-400 font-bold">[차단된 메시지]</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽 컬럼: 프로그램 제어 및 설정 */}
          <div className="flex min-h-0 flex-col rounded-lg border border-gray-800 bg-gray-800">
            <div className="flex border-b border-gray-700 bg-gray-700/50">
              <button
                onClick={() => setActiveTab("control")}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "control"
                    ? "bg-gray-800 text-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                프로그램 제어
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "messages"
                    ? "bg-gray-800 text-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                채팅 관리
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "control" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="mb-4 text-xl font-bold">프로그램 전환</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {["chat", "quiz", "raffle", "poll"].map((program) => (
                        <button
                          key={program}
                          onClick={() => handleChangeProgram(program)}
                          className={`rounded-lg border-2 p-4 text-center font-semibold transition-all ${
                            selectedProgram === program
                              ? "border-blue-500 bg-blue-600 shadow-lg shadow-blue-900/20"
                              : "border-gray-700 bg-gray-900 hover:border-gray-600"
                          }`}
                        >
                          <div className="text-lg mb-1">
                            {program === "chat" && "💬"}
                            {program === "quiz" && "❓"}
                            {program === "raffle" && "🎁"}
                            {program === "poll" && "📊"}
                          </div>
                          <div className="text-sm">
                            {program === "chat" && "기본 채팅"}
                            {program === "quiz" && "퀴즈"}
                            {program === "raffle" && "추첨"}
                            {program === "poll" && "투표"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-8">
                    {selectedProgram === "quiz" && <AdminQuiz roomId={roomId} />}
                    {selectedProgram === "raffle" && <AdminRaffle roomId={roomId} participants={participants} />}
                    {selectedProgram === "poll" && <AdminPoll roomId={roomId} />}
                    {selectedProgram === "chat" && (
                      <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-700 text-gray-500">
                        기본 채팅 프로그램이 활성화되어 있습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "messages" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">채팅 관리</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {messages.length === 0 ? (
                      <p className="col-span-full text-center py-10 text-gray-500">메시지가 없습니다.</p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-blue-400">{message.nickname}</span>
                              <span className="text-[10px] text-gray-500">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 break-all">{message.content}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="ml-4 rounded bg-red-900/30 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/50 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 방 설정 모달 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-2xl border border-gray-700">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">방 설정</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-8">
              <form onSubmit={handleUpdateRoomSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    방 이름
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="행사 이름을 입력하세요"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingRoom}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 shadow-lg shadow-blue-900/20"
                >
                  {isUpdatingRoom ? "저장 중..." : "방 이름 저장"}
                </button>
              </form>

              <div className="border-t border-gray-700 pt-6">
                <label className="block text-sm font-medium text-gray-400 mb-4">
                  행사 로고 설정
                </label>
                <div className="space-y-6">
                  {editLogoUrl ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-900 group">
                      <img
                        src={editLogoUrl}
                        alt="Logo Preview"
                        className="h-full w-full object-contain"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute right-3 top-3 rounded-full bg-red-600 p-2 text-white shadow-lg hover:bg-red-700 transition-all opacity-0 group-hover:opacity-100"
                        title="로고 삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">등록된 로고가 없습니다.</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <label className="cursor-pointer rounded-xl bg-gray-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-gray-600 transition-colors shadow-md">
                      {isUploading ? "업로드 중..." : "이미지 업로드"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-500">
                        또는 이미지 URL 입력
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editLogoUrl}
                          onChange={(e) => setEditLogoUrl(e.target.value)}
                          className="flex-1 rounded-xl bg-gray-900 border border-gray-700 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
                          placeholder="https://example.com/logo.png"
                        />
                        <button
                          onClick={handleUpdateRoomSettings}
                          className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 transition-colors shadow-md"
                        >
                          적용
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="mt-8 w-full rounded-xl bg-gray-700 py-3 font-semibold text-white hover:bg-gray-600 transition-colors shadow-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 기록 삭제 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-white text-center">기록 삭제</h3>
            
            <div className="space-y-6 mb-8">
              <label className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={deleteOptions.chat}
                  onChange={(e) => setDeleteOptions(prev => ({ ...prev, chat: e.target.checked }))}
                  className="h-6 w-6 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-bold text-white text-lg">채팅 기록</p>
                  <p className="text-sm text-gray-400">이 방의 모든 메시지를 삭제합니다.</p>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={deleteOptions.quiz}
                  onChange={(e) => setDeleteOptions(prev => ({ ...prev, quiz: e.target.checked }))}
                  className="h-6 w-6 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-bold text-white text-lg">퀴즈 데이터</p>
                  <p className="text-sm text-gray-400">프로젝트, 관리내용, 이미지 등 모든 퀴즈 기록을 삭제합니다.</p>
                </div>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteOptions({ chat: false, quiz: false });
                }}
                className="flex-1 rounded-xl bg-gray-700 py-3 font-bold text-white hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteRecords}
                disabled={isDeleting || (!deleteOptions.chat && !deleteOptions.quiz)}
                className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? "삭제 중..." : "선택 항목 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
