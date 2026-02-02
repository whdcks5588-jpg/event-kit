"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로 이동
    const user = auth.getUser();
    if (user) {
      router.push("/dashboard");
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isLoggingIn) return;

    setIsLoggingIn(true);
    setError("");

    const { user, error: loginError } = await auth.login(username.trim(), password);

    if (user) {
      router.push("/dashboard");
    } else {
      setError(loginError || "로그인에 실패했습니다.");
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold text-white">이벤트 킷</h1>
          <p className="text-xl text-gray-400">
            기업 행사용 실시간 이벤트 플랫폼
          </p>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-sm">
          <h2 className="mb-6 text-2xl font-semibold text-white">로그인</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                아이디
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || isLoggingIn}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>이벤트 킷으로 실시간 채팅, 퀴즈, 추첨을 진행하세요</p>
        </div>
      </div>
    </div>
  );
}
