// TS 5.9+ 는 side-effect import('./global.css')에도 모듈 선언을 요구한다 (ts2882).
// NativeWind 가 Metro 단에서 처리하는 CSS 파일을 타입 시스템에 알린다.
declare module '*.css';
