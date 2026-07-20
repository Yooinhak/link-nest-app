/**
 * URL → 도메인 표시 정보 (파비콘 + 표시명).
 *
 * 파비콘은 Google S2 서비스(https://www.google.com/s2/favicons)로 조회 —
 * 어떤 도메인이든 동작하고 별도 브랜드 에셋 관리가 필요 없다.
 * 주요 서비스는 단축/서브도메인을 대표 도메인으로 정규화하고 한글 표시명을 매핑한다.
 * (예: youtu.be → youtube.com "YouTube", *.tistory.com → tistory.com "티스토리")
 */

export interface DomainInfo {
  /** www 제거된 원본 호스트명 */
  hostname: string;
  /** 표시용 이름 — 알려진 서비스는 브랜드명, 그 외엔 hostname */
  label: string;
  /** 파비콘 이미지 URL (64px PNG) */
  faviconUrl: string;
}

interface ServiceRule {
  test: (hostname: string) => boolean;
  /** 파비콘 조회용 대표 도메인 (미지정 시 hostname 그대로) */
  faviconDomain?: string;
  label: string;
}

const SERVICE_RULES: ServiceRule[] = [
  {
    test: (h) => h === 'youtu.be' || h === 'youtube.com' || h.endsWith('.youtube.com'),
    faviconDomain: 'youtube.com',
    label: 'YouTube',
  },
  {
    test: (h) => h === 'instagram.com' || h.endsWith('.instagram.com'),
    faviconDomain: 'instagram.com',
    label: 'Instagram',
  },
  {
    test: (h) => h === 'blog.naver.com' || h === 'm.blog.naver.com',
    faviconDomain: 'blog.naver.com',
    label: '네이버 블로그',
  },
  {
    test: (h) => h === 'cafe.naver.com' || h === 'm.cafe.naver.com',
    faviconDomain: 'cafe.naver.com',
    label: '네이버 카페',
  },
  {
    test: (h) => h === 'naver.com' || h.endsWith('.naver.com'),
    faviconDomain: 'naver.com',
    label: '네이버',
  },
  {
    test: (h) => h.endsWith('.tistory.com'),
    faviconDomain: 'tistory.com',
    label: '티스토리',
  },
  {
    test: (h) => h === 'velog.io' || h.endsWith('.velog.io'),
    faviconDomain: 'velog.io',
    label: 'velog',
  },
  {
    test: (h) => h === 'brunch.co.kr',
    label: '브런치',
  },
  {
    test: (h) => h === 'x.com' || h === 'twitter.com' || h.endsWith('.twitter.com'),
    faviconDomain: 'x.com',
    label: 'X',
  },
  {
    test: (h) => h === 'threads.net' || h === 'threads.com' || h.endsWith('.threads.net'),
    faviconDomain: 'threads.net',
    label: 'Threads',
  },
  {
    test: (h) => h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.com',
    faviconDomain: 'facebook.com',
    label: 'Facebook',
  },
  {
    test: (h) => h === 'github.com' || h.endsWith('.github.com') || h.endsWith('.github.io'),
    faviconDomain: 'github.com',
    label: 'GitHub',
  },
  {
    test: (h) => h === 'medium.com' || h.endsWith('.medium.com'),
    faviconDomain: 'medium.com',
    label: 'Medium',
  },
  {
    test: (h) => h === 'notion.so' || h === 'notion.site' || h.endsWith('.notion.site'),
    faviconDomain: 'notion.so',
    label: 'Notion',
  },
  {
    test: (h) => h === 'pinterest.com' || h.endsWith('.pinterest.com') || h === 'pin.it',
    faviconDomain: 'pinterest.com',
    label: 'Pinterest',
  },
];

function faviconServiceUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function getDomainInfo(url: string): DomainInfo | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }

  const rule = SERVICE_RULES.find((r) => r.test(hostname));
  const faviconDomain = rule?.faviconDomain ?? hostname;

  return {
    hostname,
    label: rule?.label ?? hostname,
    faviconUrl: faviconServiceUrl(faviconDomain),
  };
}
