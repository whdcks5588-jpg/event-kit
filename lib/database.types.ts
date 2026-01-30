// Supabase에서 자동 생성되는 타입 (수동 정의)
export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          title: string;
          status: "waiting" | "active";
          current_program: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          status?: "waiting" | "active";
          current_program?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          status?: "waiting" | "active";
          current_program?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          nickname: string;
          room_id: string;
          session_token: string;
          is_active: boolean;
          last_seen_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nickname: string;
          room_id: string;
          session_token: string;
          is_active?: boolean;
          last_seen_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          room_id?: string;
          session_token?: string;
          is_active?: boolean;
          last_seen_at?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          participant_id: string;
          nickname: string;
          content: string;
          is_blocked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          participant_id: string;
          nickname: string;
          content: string;
          is_blocked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          participant_id?: string;
          nickname?: string;
          content?: string;
          is_blocked?: boolean;
          created_at?: string;
        };
      };
    };
  };
};
