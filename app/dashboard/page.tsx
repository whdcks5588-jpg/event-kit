"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, User } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/lib/database.types";

type Room = Tables<"rooms">;

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 임시 계정 관련 상태
  const [tempUsers, setTempUsers] = useState<User[]>([]);
  const [tempUsername, setTempUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [tempMemo, setTempMemo] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editMemo, setEditMemo] = useState("");

  useEffect(() => {
    const currentUser = auth.getUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);
    loadRooms(currentUser);
    if (currentUser.role === "admin") {
      loadTempUsers();
    }
  }, [router]);

  async function loadTempUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "user")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load temp users error:", error);
    } else {
      setTempUsers(data || []);
    }
  }

  async function loadRooms(currentUser: User) {
    setIsLoading(true);
    let query = supabase.from("rooms").select("*").order("created_at", { ascending: false });

    // 관리자가 아니면 자신이 만든 방만 조회
    if (currentUser.role !== "admin") {
      query = query.eq("created_by", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Load rooms error:", error);
    } else {
      setRooms(data || []);
    }
    setIsLoading(false);
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomTitle.trim() || isCreating || !user) return;

    setIsCreating(true);
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        title: newRoomTitle.trim(),
        status: "waiting",
        current_program: "chat",
        created_by: user.id,
        created_by_username: user.username,
      })
      .select()
      .single();

    if (error) {
      console.error("Create room error:", error);
      alert("방 생성에 실패했습니다.");
    } else {
      setNewRoomTitle("");
      loadRooms(user);
    }
    setIsCreating(false);
  }

  async function handleDeleteRoom(id: string) {
    if (!confirm("정말 이 방을 삭제하시겠습니까? 방과 관련된 모든 데이터(채팅, 퀴즈, 참여자 등)가 영구적으로 삭제됩니다.")) return;

    setIsLoading(true);
    try {
      // 1. 채팅 메시지 삭제
      await supabase.from("messages").delete().eq("room_id", id);
      
      // 2. 참여자 삭제
      await supabase.from("participants").delete().eq("room_id", id);

      // 3. 퀴즈 데이터 삭제
      const { data: projects } = await supabase.from("quiz_projects").select("id").eq("room_id", id);
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: sessions } = await supabase.from("quiz_sessions").select("id").in("project_id", projectIds);
        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);
          await supabase.from("quiz_answers").delete().in("session_id", sessionIds);
          await supabase.from("quiz_sessions").delete().in("project_id", projectIds);
        }
        await supabase.from("quiz_projects").delete().eq("room_id", id);
      }

      // 4. 폴(투표) 데이터 삭제
      const { data: polls } = await supabase.from("poll_sessions").select("id").eq("room_id", id);
      if (polls && polls.length > 0) {
        const pollIds = polls.map(p => p.id);
        await supabase.from("poll_votes").delete().in("poll_id", pollIds);
        await supabase.from("poll_sessions").delete().eq("room_id", id);
      }

      // 5. 래플(추첨) 데이터 삭제
      await supabase.from("raffle_sessions").delete().eq("room_id", id);

      // 6. 방 삭제
      const { error } = await supabase.from("rooms").delete().eq("id", id);

      if (error) throw error;
      
      setRooms(rooms.filter((r) => r.id !== id));
      alert("방이 성공적으로 삭제되었습니다.");
    } catch (error: any) {
      console.error("Delete room error:", error);
      alert("방 삭제 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateRoom(id: string, currentTitle: string) {
    const newTitle = prompt("새로운 방 제목을 입력하세요", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    const { error } = await supabase
      .from("rooms")
      .update({ title: newTitle })
      .eq("id", id);

    if (error) {
      console.error("Update room error:", error);
      alert("방 제목 수정에 실패했습니다.");
    } else {
      setRooms(rooms.map((r) => (r.id === id ? { ...r, title: newTitle } : r)));
    }
  }

  async function handleCreateTempAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!tempUsername.trim() || !tempPassword.trim() || isCreatingAccount) return;

    setIsCreatingAccount(true);
    const { error } = await supabase.from("users").insert({
      username: tempUsername.trim(),
      password: tempPassword.trim(),
      role: "user",
      memo: tempMemo.trim(),
    });

    if (error) {
      console.error("Create account error:", error.message || error);
      alert(`계정 생성에 실패했습니다: ${error.message || "아이디 중복 또는 데이터베이스 오류"}`);
    } else {
      alert(`계정이 생성되었습니다: ${tempUsername}`);
      setTempUsername("");
      setTempPassword("");
      setTempMemo("");
      loadTempUsers();
    }
    setIsCreatingAccount(false);
  }

  async function handleDeleteTempAccount(id: string) {
    // 1. 해당 계정이 만든 방이 있는지 확인
    const { data: userRooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id, title")
      .eq("created_by", id);

    if (roomsError) {
      console.error("Check user rooms error:", roomsError);
      return;
    }

    let confirmMsg = "정말 이 계정을 삭제하시겠습니까?";
    if (userRooms && userRooms.length > 0) {
      confirmMsg = `해당 계정이 만든 방이 ${userRooms.length}개 존재합니다.\n계정 삭제 시 모든 방과 관련 데이터가 함께 삭제됩니다.\n계속하시겠습니까?`;
    }

    if (!confirm(confirmMsg)) return;

    setIsLoading(true);
    try {
      // 2. 해당 계정이 만든 모든 방 삭제 (기존 handleDeleteRoom 로직 재사용)
      if (userRooms && userRooms.length > 0) {
        for (const room of userRooms) {
          // 각 방의 하위 데이터 삭제
          await supabase.from("messages").delete().eq("room_id", room.id);
          await supabase.from("participants").delete().eq("room_id", room.id);

          const { data: projects } = await supabase.from("quiz_projects").select("id").eq("room_id", room.id);
          if (projects && projects.length > 0) {
            const projectIds = projects.map(p => p.id);
            const { data: sessions } = await supabase.from("quiz_sessions").select("id").in("project_id", projectIds);
            if (sessions && sessions.length > 0) {
              const sessionIds = sessions.map(s => s.id);
              await supabase.from("quiz_answers").delete().in("session_id", sessionIds);
              await supabase.from("quiz_sessions").delete().in("project_id", projectIds);
            }
            await supabase.from("quiz_projects").delete().eq("room_id", room.id);
          }

          const { data: polls } = await supabase.from("poll_sessions").select("id").eq("room_id", room.id);
          if (polls && polls.length > 0) {
            const pollIds = polls.map(p => p.id);
            await supabase.from("poll_votes").delete().in("poll_id", pollIds);
            await supabase.from("poll_sessions").delete().eq("room_id", room.id);
          }

          await supabase.from("raffle_sessions").delete().eq("room_id", room.id);
          
          // 방 삭제
          await supabase.from("rooms").delete().eq("id", room.id);
        }
      }

      // 3. 마지막으로 계정 삭제
      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) {
        throw error;
      } else {
        alert("계정과 관련 데이터가 모두 삭제되었습니다.");
        loadTempUsers();
        if (user) loadRooms(user); // 방 목록도 갱신
      }
    } catch (error: any) {
      console.error("Delete account error:", error.message || error);
      alert(`계정 삭제에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateTempAccount(id: string, newPassword: string, newMemo: string) {
      const { error } = await supabase
        .from("users")
        .update({ 
          password: newPassword,
          memo: newMemo 
        })
        .eq("id", id);

      if (error) {
        console.error("Update account error:", error.message || error);
        alert(`계정 정보 수정에 실패했습니다: ${error.message}`);
      } else {
        setIsEditModalOpen(false);
        setEditingUserId(null);
        loadTempUsers();
      }
    }

  function handleLogout() {
    auth.logout();
    router.push("/");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold">이벤트 방 관리</h1>
            <p className="text-gray-400 mt-2">
              안녕하세요, <span className="text-blue-400 font-semibold">{user.username}</span>님
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
          >
            로그아웃
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Room Creation & Admin Actions */}
          <div className="space-y-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">새 이벤트 방 만들기</h2>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="이벤트 제목"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded-lg font-semibold transition-colors"
                >
                  {isCreating ? "생성 중..." : "방 만들기"}
                </button>
              </form>
            </div>

            {user.role === "admin" && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-purple-400">임시 계정 생성 (Admin)</h2>
                <form onSubmit={handleCreateTempAccount} className="space-y-4">
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="아이디"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    required
                  />
                  <input
                    type="password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="비밀번호"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    required
                  />
                  <input
                    type="text"
                    value={tempMemo}
                    onChange={(e) => setTempMemo(e.target.value)}
                    placeholder="비고 (메모)"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingAccount}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {isCreatingAccount ? "생성 중..." : "계정 만들기"}
                  </button>
                </form>

                {/* 임시 계정 리스트 */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">임시 계정 목록</h3>
                  <div className="space-y-3">
                    {tempUsers.map((u) => (
                      <div key={u.id} className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-purple-400">{u.username}</span>
                            <span className="mx-2 text-gray-600">|</span>
                            <span className="text-gray-400">{u.password}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditUsername(u.username);
                                setEditPassword(u.password || "");
                                setEditMemo(u.memo || "");
                                setIsEditModalOpen(true);
                              }}
                              className="text-gray-500 hover:text-blue-400 transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteTempAccount(u.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs italic">
                          {u.memo || "메모 없음"}
                        </p>
                        <div className="mt-2 text-[10px] text-gray-600">
                          생성일: {u.created_at ? new Date(u.created_at).toLocaleString() : "-"}
                        </div>
                      </div>
                    ))}
                    {tempUsers.length === 0 && (
                      <p className="text-center text-gray-600 py-4 text-xs">생성된 계정이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Room List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 min-h-[400px]">
              <h2 className="text-xl font-semibold mb-6">내 이벤트 방 목록</h2>
              {isLoading ? (
                <p className="text-gray-500 text-center py-20">불러오는 중...</p>
              ) : rooms.length === 0 ? (
                <p className="text-gray-500 text-center py-20">생성된 이벤트 방이 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors group"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <h3 className="font-semibold truncate text-lg group-hover:text-blue-400 transition-colors">
                          {room.title}
                        </h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                          <span>📅 {new Date(room.created_at).toLocaleDateString()}</span>
                          <span>👤 {room.created_by_username || "알 수 없음"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/room/${room.id}/admin`)}
                          className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-sm transition-colors"
                        >
                          입장
                        </button>
                        <button
                          onClick={() => handleUpdateRoom(room.id, room.title)}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-sm transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 계정 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-blue-400">임시 계정 수정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">아이디 (수정 불가)</label>
                <input
                  type="text"
                  value={editUsername}
                  disabled
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">비밀번호</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-white"
                  placeholder="비밀번호"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">비고 (메모)</label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-white min-h-[100px]"
                  placeholder="메모 입력"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => editingUserId && handleUpdateTempAccount(editingUserId, editPassword, editMemo)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  저장하기
                </button>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingUserId(null);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors"
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
