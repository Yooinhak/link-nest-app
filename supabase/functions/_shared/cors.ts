// CORS 헤더 공용 헬퍼.
// 모아링은 모바일 앱이므로 엄밀하게는 CORS가 필수는 아니지만,
// Supabase Dashboard의 "Invoke" 버튼, 로컬 개발 브라우저 테스트를 고려해 허용해둔다.
//
// 운영 환경에서 웹 클라이언트가 추가되면 Origin을 특정 도메인으로 좁힐 것.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
