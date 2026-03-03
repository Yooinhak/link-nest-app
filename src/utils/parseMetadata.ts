export interface Metadata {
  title: string | null;
  description: string | null;
  image: string | null;
}

export async function parseMetadata(url: string): Promise<Metadata> {
  // 1차: Microlink API (기존 Next.js 앱과 동일한 소스)
  try {
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    if (json.status === 'success' && json.data) {
      return {
        title: json.data.title ?? null,
        description: json.data.description ?? null,
        image: json.data.image?.url ?? null,
      };
    }
  } catch (error) {
    console.warn('[parseMetadata] Microlink failed, trying fallback:', error);
  }

  // 2차: 직접 HTML 파싱 (fallback)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    const html = await response.text();

    const getMetaContent = (property: string): string | null => {
      // og:property (property="og:xxx" content="...")
      const patterns = [
        new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i'),
        // twitter:property
        new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']twitter:${property}["']`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1];
      }

      if (property === 'title') {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch?.[1]) return titleMatch[1].trim();
      }

      if (property === 'description') {
        const descMatch = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
        );
        if (descMatch?.[1]) return descMatch[1];
      }

      return null;
    };

    return {
      title: getMetaContent('title'),
      description: getMetaContent('description'),
      image: getMetaContent('image'),
    };
  } catch (error) {
    console.error('[parseMetadata] All methods failed:', error);
    return {
      title: null,
      description: null,
      image: null,
    };
  }
}
