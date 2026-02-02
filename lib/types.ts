// Supabase 데이터베이스 타입 정의

export type RoomStatus = "waiting" | "active";
export type ProgramType = "chat" | "quiz" | "raffle" | "poll";

export interface Room {
  id: string;
  title: string;
  status: RoomStatus;
  current_program: ProgramType | null;
  room_show_logo_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  nickname: string;
  room_id: string;
  session_token: string;
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

// ========== 퀴즈 ==========
export type QuizStatus = "waiting" | "active" | "ended";
export type QuizQuestionType = "objective" | "subjective"; // 객관식 | 주관식(확장용)

export interface QuizSession {
  id: string;
  room_id: string;
  title: string;
  question: string;
  options: string[]; // 객관식 선택지 (주관식일 땐 빈 배열 가능)
  question_type: QuizQuestionType;
  correct_answer: number | null; // 객관식: 옵션 인덱스 (0-based), 주관식: null
  time_limit_seconds: number;
  status: QuizStatus;
  image_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface QuizAnswer {
  id: string;
  session_id: string;
  participant_id: string;
  nickname: string;
  answer: number | string; // 객관식: 옵션 인덱스, 주관식: 텍스트 (DB는 JSONB)
  is_correct: boolean | null;
  submitted_at: string;
}

// ========== 추첨 (슬롯머신) ==========
export type RaffleMode = "number_range" | "nicknames";
export type RaffleStatus = "waiting" | "spinning" | "ended";

export interface RaffleSession {
  id: string;
  room_id: string;
  mode: RaffleMode;
  config: { min?: number; max?: number }; // number_range일 때만 사용
  status: RaffleStatus;
  result: string | null; // 당첨 번호 또는 닉네임
  started_at: string | null;
  created_at: string;
}

// ========== 투표 ==========
export type PollStatus = "waiting" | "active" | "ended";

export interface PollSession {
  id: string;
  room_id: string;
  title: string;
  options: string[]; // 동적 항목
  status: PollStatus;
  started_at: string | null;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  participant_id: string;
  option_index: number;
  created_at: string;
}
