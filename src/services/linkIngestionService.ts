import { Source, SourceType, ValidationCheckResult } from '../types';

export interface LinkDetectionResult {
  sourceType: SourceType;
  platform: string;
  normalizedUrl: string;
  hostname: string;
}

export interface IngestedContentResult {
  success: boolean;
  transcriptText?: string;
  textCandidate?: string;
  audioBlob?: Blob | null;
  detectedTitle?: string;
  title?: string;
  sourceType: SourceType;
  sourceUrl: string;
  durationSeconds?: number;
  error?: string;
}

export interface VideoMetadata {
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  providerName?: string;
}

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // Link-local / metadata services
  /\.local$/i,
  /\.internal$/i,
  /\.lan$/i
];

export class LinkIngestionService {
  /**
   * Validates URL syntax and enforces SSRF protection against internal/private endpoints.
   */
  validateUrl(urlString: string): ValidationCheckResult {
    if (!urlString || urlString.trim().length === 0) {
      return { valid: false, error: 'URL is required and cannot be empty.' };
    }

    let parsed: URL;
    try {
      parsed = new URL(urlString.trim());
    } catch {
      return { valid: false, error: 'Invalid URL format. Please provide a full URL starting with http:// or https://.' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: `Unsupported protocol: '${parsed.protocol}'. Only http:// and https:// links are supported.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // SSRF Guard (§12)
    const isPrivate = PRIVATE_IP_PATTERNS.some(pat => pat.test(hostname));
    if (isPrivate) {
      return {
        valid: false,
        error: 'SSRF Security Guard: Requests to local, internal, or private network addresses are strictly prohibited.'
      };
    }

    // Check for suspicious internal metadata services (e.g. AWS 169.254.169.254)
    if (hostname.includes('169.254') || hostname === 'metadata.google.internal') {
      return {
        valid: false,
        error: 'SSRF Security Guard: Access to cloud metadata services is blocked.'
      };
    }

    return { valid: true };
  }

  /**
   * Classifies the target URL into one of the supported source types.
   */
  detectSourceType(urlString: string): LinkDetectionResult {
    const valid = this.validateUrl(urlString);
    if (!valid.valid) {
      throw new Error(valid.error || 'Invalid URL');
    }

    const parsed = new URL(urlString.trim());
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // Video platforms
    if (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('vimeo.com') ||
      host.includes('dailymotion.com')
    ) {
      return {
        sourceType: 'URL_VIDEO',
        platform: host.includes('youtu') ? 'YouTube' : 'Video Platform',
        normalizedUrl: parsed.href,
        hostname: host
      };
    }

    // Direct audio files or podcast audio
    if (
      pathname.endsWith('.mp3') ||
      pathname.endsWith('.m4a') ||
      pathname.endsWith('.wav') ||
      pathname.endsWith('.aac') ||
      pathname.endsWith('.ogg') ||
      host.includes('podcasts.google.com') ||
      host.includes('podcasts.apple.com') ||
      host.includes('spotify.com') ||
      host.includes('soundcloud.com') ||
      host.includes('podcast') ||
      pathname.includes('podcast')
    ) {
      return {
        sourceType: 'URL_AUDIO',
        platform: 'Audio / Podcast',
        normalizedUrl: parsed.href,
        hostname: host
      };
    }

    // Standard web article / lecture notes page
    return {
      sourceType: 'URL_ARTICLE',
      platform: 'Web Article',
      normalizedUrl: parsed.href,
      hostname: host
    };
  }

  /**
   * Fetches video metadata via official CORS-friendly oEmbed APIs (e.g. YouTube).
   */
  async fetchVideoMetadata(urlString: string): Promise<VideoMetadata | null> {
    const valid = this.validateUrl(urlString);
    if (!valid.valid) return null;

    try {
      const parsed = new URL(urlString.trim());
      const host = parsed.hostname.toLowerCase();

      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(urlString.trim())}&format=json`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data = await res.json();
          return {
            title: data.title,
            authorName: data.author_name,
            thumbnailUrl: data.thumbnail_url,
            providerName: 'YouTube'
          };
        }
      }
    } catch {
      // Non-blocking fallback
    }
    return null;
  }

  /**
   * Cleans raw pasted transcript text, especially YouTube transcripts with line-by-line timestamps.
   * Strips timestamp markers (e.g., "0:05", "1:23:45", "[00:12]", "(1:30)") while preserving speech text.
   */
  cleanTranscriptText(rawText: string): string {
    if (!rawText) return '';

    const lines = rawText.split(/\r?\n/);
    const cleanedLines: string[] = [];

    for (let line of lines) {
      // Remove leading/standalone timestamp patterns:
      // "0:00", "01:23", "1:23:45", "[01:23]", "(01:23)"
      line = line.replace(/^\s*\[?\(?\d{1,2}:\d{2}(?::\d{2})?\)?\]?\s*/, '');
      // Also remove inline timestamps like " 0:15 "
      line = line.replace(/\s+\[?\(?\d{1,2}:\d{2}(?::\d{2})?\)?\]?\s+/g, ' ');

      const trimmed = line.trim();
      // Skip lines that were only timestamps and are now empty
      if (trimmed.length > 0) {
        cleanedLines.push(trimmed);
      }
    }

    return cleanedLines.join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Ingests a URL according to Path A (Audio/Video) or Path B (Web Article).
   * Strictly outputs verbatim text candidate or raw audio; NEVER creates notes or summaries.
   */
  async ingestUrl(
    sourceOrUrl: Source | string,
    onProgress?: (msg: string) => void
  ): Promise<IngestedContentResult> {
    const url = typeof sourceOrUrl === 'string' ? sourceOrUrl : (sourceOrUrl.sourceUrl || '');
    const validation = this.validateUrl(url);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid URL for ingestion.',
        sourceType: 'URL_ARTICLE',
        sourceUrl: url
      };
    }

    const detection = this.detectSourceType(url);
    const source: Source = typeof sourceOrUrl === 'string'
      ? {
          id: `src_temp_${Date.now()}`,
          sourceType: detection.sourceType,
          sourceUrl: url,
          userId: 'usr_101',
          title: detection.platform,
          subject: 'General',
          durationSeconds: 0,
          createdAt: Date.now(),
          status: 'FETCHING'
        }
      : sourceOrUrl;

    if (onProgress) onProgress(`Connecting to ${detection.platform} (${detection.hostname})...`);

    try {
      let res: IngestedContentResult;
      if (detection.sourceType === 'URL_VIDEO') {
        res = await this.ingestVideo(source, detection, onProgress);
      } else if (detection.sourceType === 'URL_AUDIO') {
        res = await this.ingestAudio(source, detection, onProgress);
      } else {
        res = await this.ingestArticle(source, detection, onProgress);
      }
      return {
        ...res,
        success: true,
        title: res.title || res.detectedTitle,
        transcriptText: res.transcriptText || res.textCandidate
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to ingest URL.';
      return {
        success: false,
        error: errorMsg,
        sourceType: detection.sourceType,
        sourceUrl: url
      };
    }
  }

  /**
   * Path A (Video): Fetches video metadata or transcript tracks.
   */
  private async ingestVideo(
    source: Source,
    detection: LinkDetectionResult,
    onProgress?: (msg: string) => void
  ): Promise<IngestedContentResult> {
    const url = source.sourceUrl || '';
    const parsed = new URL(url);

    if (onProgress) onProgress('Resolving video lecture captions and speech metadata...');

    // Extract YouTube Video ID
    let videoId: string | null = null;
    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.replace(/^\//, '').split('/')[0];
    } else if (parsed.hostname.includes('youtube.com')) {
      videoId = parsed.searchParams.get('v');
    }

    if (!videoId && detection.platform === 'YouTube') {
      throw new Error('Could not identify a valid YouTube video ID from the provided link.');
    }

    // Attempt to fetch public caption or audio metadata
    try {
      if (onProgress) onProgress('Fetching lecture transcript from video source...');

      // In client web apps, direct scraping of YouTube watch page or caption tracks can hit CORS if not proxied.
      // We perform a safe fetch attempt, and if CORS blocked or no captions, provide clear guidance without fabrication.
      const response = await fetch(url, { method: 'GET', mode: 'cors' }).catch(() => null);

      if (response && response.ok) {
        const html = await response.text();
        const extracted = this.extractArticleText(html);
        if (extracted.text.length > 50) {
          return {
            success: true,
            textCandidate: extracted.text,
            transcriptText: extracted.text,
            detectedTitle: extracted.title || source.title,
            title: extracted.title || source.title,
            sourceType: 'URL_VIDEO',
            sourceUrl: url,
            durationSeconds: source.durationSeconds || 1800
          };
        }
      }

      // If YouTube or video platform restricts direct browser-side HTML extraction,
      // provide a clean typed failure with instructions for video transcripts
      throw new Error(
        `Direct caption extraction for ${detection.platform} is restricted by platform CORS and security policies. ` +
        `Please paste the video transcript or captions directly into the "Lecture Transcript / Captions" box when creating the note.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve video lecture transcript.';
      throw new Error(msg);
    }
  }

  /**
   * Path A (Audio): Downloads direct audio stream (mp3/m4a/wav) for the TranscriptionService.
   */
  private async ingestAudio(
    source: Source,
    detection: LinkDetectionResult,
    onProgress?: (msg: string) => void
  ): Promise<IngestedContentResult> {
    const url = source.sourceUrl || '';
    if (onProgress) onProgress(`Streaming audio track from ${detection.hostname}...`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`PAYWALLED: The audio source requires authentication or payment (HTTP ${response.status}).`);
        }
        throw new Error(`UNREACHABLE: Audio stream could not be reached (HTTP ${response.status}).`);
      }

      const audioBlob = await response.blob();

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Audio file at URL returned 0 bytes.');
      }

      return {
        success: true,
        audioBlob,
        detectedTitle: source.title,
        title: source.title,
        sourceType: 'URL_AUDIO',
        sourceUrl: url,
        durationSeconds: source.durationSeconds || 1800
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download audio track from URL.';
      throw new Error(msg);
    }
  }

  /**
   * Path B (Article): Fetches webpage HTML and extracts substantive lecture text.
   */
  private async ingestArticle(
    source: Source,
    detection: LinkDetectionResult,
    onProgress?: (msg: string) => void
  ): Promise<IngestedContentResult> {
    const url = source.sourceUrl || '';
    if (onProgress) onProgress(`Fetching article page from ${detection.hostname}...`);

    let html = '';
    let lastError: Error | null = null;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`PAYWALLED: This article requires login or subscription (HTTP ${response.status}).`);
        }
        if (response.status === 404) {
          throw new Error('UNREACHABLE: Article page was not found (HTTP 404).');
        }
        throw new Error(`UNREACHABLE: Could not fetch article from link (HTTP ${response.status}).`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        throw new Error(`UNSUPPORTED_TYPE: URL did not return HTML or text content (Content-Type: ${contentType}).`);
      }

      html = await response.text();
    } catch (fetchErr: unknown) {
      lastError = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr));

      // If running in browser and direct fetch failed (likely CORS), attempt dev proxy fallback
      if (
        typeof window !== 'undefined' &&
        !lastError.message.startsWith('PAYWALLED') &&
        !lastError.message.startsWith('UNSUPPORTED_TYPE')
      ) {
        try {
          if (onProgress) onProgress(`Retrying article fetch via secure proxy...`);
          const proxyRes = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
          if (proxyRes.ok) {
            const contentType = proxyRes.headers.get('content-type') || '';
            if (contentType.includes('text/html') || contentType.includes('text/plain') || !contentType) {
              html = await proxyRes.text();
              lastError = null;
            } else {
              lastError = new Error(`UNSUPPORTED_TYPE: URL did not return HTML or text content (Content-Type: ${contentType}).`);
            }
          } else {
            if (proxyRes.status === 401 || proxyRes.status === 403) {
              lastError = new Error(`PAYWALLED: This article requires login or subscription (HTTP ${proxyRes.status}).`);
            } else if (proxyRes.status === 404) {
              lastError = new Error('UNREACHABLE: Article page was not found (HTTP 404).');
            }
          }
        } catch {
          // Keep original error
        }
      }
    }

    if (lastError || !html) {
      throw lastError || new Error('Network error fetching article link.');
    }

    if (onProgress) onProgress('Extracting readable lecture content and stripping boilerplate...');
    const extracted = this.extractArticleText(html);

    if (!extracted.text || extracted.text.trim().length === 0) {
      throw new Error('Article extraction yielded no readable text (empty page content). The page may require JavaScript or authentication.');
    }

    return {
      success: true,
      textCandidate: extracted.text,
      transcriptText: extracted.text,
      detectedTitle: extracted.title || source.title,
      title: extracted.title || source.title,
      sourceType: 'URL_ARTICLE',
      sourceUrl: url,
      durationSeconds: Math.max(60, Math.round(extracted.text.split(/\s+/).length / 2.5)) // rough reading time equivalent
    };
  }

  /**
   * Pure HTML text extractor: Strips boilerplate, navigation, scripts, ads, and footers.
   */
  extractArticleText(html: string): { title?: string; text: string } {
    if (!html) return { text: '' };

    // Extract Title
    let title: string | undefined;
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
    }

    // Clean HTML string using regular expressions for environments without DOM,
    // or standard DOMParser if running in browser
    let cleanText = '';

    if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove scripts, styles, navigations, footers, and ads
        const removeSelectors = [
          'script',
          'style',
          'noscript',
          'iframe',
          'nav',
          'header',
          'footer',
          'aside',
          'form',
          '.advertisement',
          '.ad',
          '.social-share',
          '.comments'
        ];

        removeSelectors.forEach(sel => {
          doc.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Target main article body if available
        const main = doc.querySelector('main, article, [role="main"], .post-content, .article-content, #content') || doc.body;
        cleanText = (main ? main.textContent : doc.body.textContent) || '';
      } catch {
        cleanText = this.stripTagsRegex(html);
      }
    } else {
      cleanText = this.stripTagsRegex(html);
    }

    // Meaning-preserving whitespace normalization
    const normalized = cleanText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { title, text: normalized };
  }

  private stripTagsRegex(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }
}

export const linkIngestionService = new LinkIngestionService();
