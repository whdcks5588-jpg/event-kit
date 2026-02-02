import { supabase } from "./supabase";

export interface User {
  id: string;
  username: string;
  role: "admin" | "user";
  password?: string;
  memo?: string;
  created_at?: string;
}

const AUTH_STORAGE_KEY = "event-kit-auth";

export const auth = {
  async login(username: string, password: string): Promise<{ user: User | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return { user: null, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
        }
        if (error.message.includes("relation \"public.users\" does not exist")) {
          return { user: null, error: "데이터베이스 설정이 완료되지 않았습니다. SQL 마이그레이션을 실행해 주세요." };
        }
        return { user: null, error: `로그인 중 오류가 발생했습니다: ${error.message}` };
      }

      if (!data) {
        return { user: null, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
      }

      const user: User = {
        id: data.id,
        username: data.username,
        role: data.role as "admin" | "user",
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return { user };
    } catch (err: any) {
      return { user: null, error: `시스템 오류가 발생했습니다: ${err.message}` };
    }
  },

  logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  isAdmin(): boolean {
    return this.getUser()?.role === "admin";
  },
};
