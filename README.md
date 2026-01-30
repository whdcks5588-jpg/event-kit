# 이벤트 킷 (Event Kit)

기업 행사용 실시간 이벤트 플랫폼 SaaS

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Realtime)
- **QR Code**: qrcode

## 주요 기능

1. **참가자용 모바일 페이지** (`/room/[id]`)
   - QR 코드로 접속
   - 닉네임 설정 및 세션 관리
   - 실시간 채팅

2. **행사장 메인 화면** (`/room/[id]/display`)
   - 대형 스크린 전용 뷰
   - QR 코드 표시
   - 실시간 접속자 수
   - 실시간 채팅 월 (애니메이션)

3. **호스트 관리 페이지** (`/room/[id]/admin`)
   - 실시간 접속자 관리
   - 메시지 삭제 및 차단
   - 프로그램 제어 (채팅, 퀴즈, 추첨, 투표)

## Supabase 데이터베이스 설정

### 1. 테이블 생성

Supabase 대시보드에서 SQL Editor를 열고 다음 SQL을 실행하세요:

```sql
-- rooms 테이블
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active')),
  current_program TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- participants 테이블
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- messages 테이블
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_participants_room_id ON participants(room_id);
CREATE INDEX idx_participants_session_token ON participants(session_token);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_blocked ON messages(is_blocked);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- rooms 테이블의 updated_at 트리거
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Realtime 활성화

Supabase 대시보드에서:
1. Database → Replication 메뉴로 이동
2. 다음 테이블들의 Realtime을 활성화:
   - `rooms`
   - `participants`
   - `messages`

### 3. Row Level Security (RLS) 설정

현재는 모든 사용자가 읽기/쓰기가 가능하도록 설정되어 있습니다. 프로덕션 환경에서는 적절한 RLS 정책을 설정하세요.

```sql
-- 예시: 모든 사용자가 읽기 가능
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow public read access" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON messages FOR SELECT USING (true);

-- 모든 사용자가 쓰기 가능 (개발용)
CREATE POLICY "Allow public insert" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON participants FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON messages FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON messages FOR DELETE USING (true);
```

## 환경 변수 설정

`.env.local` 파일에 다음을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## 사용 방법

1. 홈페이지(`/`)에서 새 이벤트 방 생성
2. 관리자 페이지(`/room/[id]/admin`)에서 이벤트 관리
3. 디스플레이 페이지(`/room/[id]/display`)를 대형 스크린에 표시
4. 참가자들이 QR 코드를 스캔하여 접속 (`/room/[id]`)

## 라이선스

MIT
