// Supabase 데이터베이스 타입 정의

export type RoomStatus = "waiting" | "active";

export interface Room {
  id: string;
  title: string;
  status: RoomStatus;
  current_program: string | null; // "chat" | "quiz" | "raffle" | null
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  nickname: string;
  room_id: string;
  session_token: string; // 세션 유지용
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  participant_id: string;
  nickname: string;
  content: string;
  is_blocked: boolean;
  created_at: string;
}
