// 유틸리티 함수들

export function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function getRoomUrl(roomId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/room/${roomId}`;
}

export function getDisplayUrl(roomId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/room/${roomId}/display`;
}

export function getAdminUrl(roomId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/room/${roomId}/admin`;
}
