import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkIngestionService } from '../linkIngestionService';
import { pipelineService } from '../pipelineService';
import { storageService } from '../storageService';
import { synthesisService } from '../synthesisService';

describe('Link Ingestion & URL Note Pipeline', () => {
  beforeEach(async () => {
    await storageService.init();
    vi.restoreAllMocks();
  });

  describe('SSRF Protection & URL Validation', () => {
    it('rejects loopback and localhost addresses', () => {
      expect(linkIngestionService.validateUrl('http://localhost').valid).toBe(false);
      expect(linkIngestionService.validateUrl('http://127.0.0.1/admin').valid).toBe(false);
      expect(linkIngestionService.validateUrl('http://127.0.0.2:8080').valid).toBe(false);
      expect(linkIngestionService.validateUrl('http://[::1]').valid).toBe(false);
    });

    it('rejects private IPv4 subnets (RFC 1918 & Cloud Metadata)', () => {
      expect(linkIngestionService.validateUrl('http://10.0.0.5/api').valid).toBe(false);
      expect(linkIngestionService.validateUrl('https://192.168.1.1/router').valid).toBe(false);
      expect(linkIngestionService.validateUrl('http://172.16.0.1').valid).toBe(false);
      expect(linkIngestionService.validateUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
    });

    it('rejects unsupported or dangerous protocols', () => {
      expect(linkIngestionService.validateUrl('ftp://example.com/lecture.mp3').valid).toBe(false);
      expect(linkIngestionService.validateUrl('file:///etc/passwd').valid).toBe(false);
      expect(linkIngestionService.validateUrl('javascript:alert(1)').valid).toBe(false);
      expect(linkIngestionService.validateUrl('not-a-url').valid).toBe(false);
    });

    it('accepts legitimate public URLs', () => {
      expect(linkIngestionService.validateUrl('https://en.wikipedia.org/wiki/Deep_learning').valid).toBe(true);
      expect(linkIngestionService.validateUrl('https://www.youtube.com/watch?v=aircAruvnKk').valid).toBe(true);
      expect(linkIngestionService.validateUrl('https://example.com/lecture-notes').valid).toBe(true);
    });
  });

  describe('Source Type Detection', () => {
    it('identifies YouTube and video platforms as URL_VIDEO', () => {
      expect(linkIngestionService.detectSourceType('https://www.youtube.com/watch?v=dQw4w9WgXcQ').sourceType).toBe('URL_VIDEO');
      expect(linkIngestionService.detectSourceType('https://youtu.be/dQw4w9WgXcQ').sourceType).toBe('URL_VIDEO');
      expect(linkIngestionService.detectSourceType('https://vimeo.com/12345678').sourceType).toBe('URL_VIDEO');
    });

    it('identifies podcast and audio streams as URL_AUDIO', () => {
      expect(linkIngestionService.detectSourceType('https://podcasts.google.com/feed/123').sourceType).toBe('URL_AUDIO');
      expect(linkIngestionService.detectSourceType('https://open.spotify.com/episode/abc').sourceType).toBe('URL_AUDIO');
      expect(linkIngestionService.detectSourceType('https://cdn.example.org/audio/lecture3.mp3').sourceType).toBe('URL_AUDIO');
      expect(linkIngestionService.detectSourceType('https://audio.example.org/lecture.m4a').sourceType).toBe('URL_AUDIO');
    });

    it('identifies articles and standard web pages as URL_ARTICLE', () => {
      expect(linkIngestionService.detectSourceType('https://arxiv.org/abs/1706.03762').sourceType).toBe('URL_ARTICLE');
      expect(linkIngestionService.detectSourceType('https://en.wikipedia.org/wiki/Neural_network').sourceType).toBe('URL_ARTICLE');
      expect(linkIngestionService.detectSourceType('https://medium.com/@author/quantum-computing').sourceType).toBe('URL_ARTICLE');
    });
  });

  describe('HTML Article Extraction & Boilerplate Removal', () => {
    it('removes scripts, navigation, headers, footers, and styles', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Introduction to Machine Learning</title>
            <style>body { color: red; }</style>
            <script>console.log('ad tracker');</script>
          </head>
          <body>
            <header><nav><a href="/">Home</a><a href="/login">Login</a></nav></header>
            <main>
              <article>
                <h1>Lecture 1: Supervised Learning</h1>
                <p>Supervised learning algorithms build a mathematical model of a set of data that contains both the inputs and the desired outputs.</p>
                <p>Common algorithms include linear regression, logistic regression, support vector machines, and random forests.</p>
              </article>
            </main>
            <aside>Related articles and sponsored advertisements</aside>
            <footer>Copyright 2026 Stanford University. All rights reserved.</footer>
          </body>
        </html>
      `;

      const result = linkIngestionService.extractArticleText(html);
      expect(result.title).toBe('Introduction to Machine Learning');
      expect(result.text).toContain('Supervised learning algorithms build a mathematical model');
      expect(result.text).toContain('linear regression, logistic regression');
      expect(result.text).not.toContain('console.log');
      expect(result.text).not.toContain('color: red');
      expect(result.text).not.toContain('sponsored advertisements');
      expect(result.text).not.toContain('Copyright 2026 Stanford University');
    });
  });

  describe('Pipeline createNoteFromUrl Integration', () => {
    it('immediately rejects SSRF target URLs without making network requests', async () => {
      await expect(
        pipelineService.createNoteFromUrl('http://127.0.0.1:8000/internal-secrets')
      ).rejects.toThrow(/SSRF Security Guard|prohibited|private/i);
    });

    it('creates structured notes from an article URL with verified provenance', async () => {
      const articleHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Lecture: Quantum Cryptography Protocols</title></head>
          <body>
            <article>
              <h1>Quantum Cryptography Protocols</h1>
              <p>Quantum key distribution allows two parties to produce a shared random secret key known only to them. The security of quantum cryptography relies on the fundamental foundations of quantum mechanics.</p>
              <p>The BB84 protocol was developed by Charles Bennett and Gilles Brassard in 1984. It is the first quantum cryptography protocol.</p>
              <p>The no-cloning theorem states that it is impossible to create an identical copy of an arbitrary unknown quantum state.</p>
            </article>
          </body>
        </html>
      `;

      // Mock fetch
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: async () => articleHtml
      } as unknown as Response);

      // Mock synthesis
      vi.spyOn(synthesisService, 'synthesizeNotes').mockResolvedValueOnce({
        title: 'Quantum Cryptography Protocols',
        summary: 'Overview of quantum key distribution, BB84, and the no-cloning theorem.',
        sections: [
          {
            heading: 'Foundations of QKD',
            points: ['Relies on fundamental laws of quantum physics rather than computational hardness.'],
            definitions: [
              {
                term: 'No-Cloning Theorem',
                definition: 'Impossible to create an identical copy of an unknown quantum state.',
                added_context: 'Guarantees eavesdropping detection'
              }
            ],
            exam_flag: 'BB84 is frequently tested in quantum information courses.'
          }
        ]
      });

      const note = await pipelineService.createNoteFromUrl(
        'https://cs.university.edu/lectures/quantum-crypto',
        'Physics',
        'Quantum Cryptography'
      );

      expect(note).toBeDefined();
      expect(note.sourceType).toBe('URL_ARTICLE');
      expect(note.sourceUrl).toBe('https://cs.university.edu/lectures/quantum-crypto');
      expect(note.title).toBe('Quantum Cryptography Protocols');
      expect(note.source).toBe('ai_generated');
      expect(note.version).toBe(1);
      expect(note.structuredNotes.sections[0].definitions![0].term).toBe('No-Cloning Theorem');

      // Verify transcript was saved and validated through §7 gate
      const transcript = await storageService.getTranscript(note.transcriptId);
      expect(transcript).toBeDefined();
      expect(transcript?.status).toBe('COMPLETED');
      expect(transcript?.sourceUrl).toBe('https://cs.university.edu/lectures/quantum-crypto');
    });

    it('fails cleanly without fabricating fake notes when URL returns paywall or 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        text: async () => '404 Page Not Found'
      } as unknown as Response);

      await expect(
        pipelineService.createNoteFromUrl('https://example.org/missing-lecture')
      ).rejects.toThrow(/HTTP 404/);
    });

    it('fails cleanly when extracted text is empty or too short (no hallucinated note fallback)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => '<html><body><p></p></body></html>'
      } as unknown as Response);

      await expect(
        pipelineService.createNoteFromUrl('https://example.org/empty-page')
      ).rejects.toThrow(/empty/i);
    });

    it('creates note from YouTube URL with providedTranscriptText, cleaning timestamps and preserving provenance', async () => {
      const rawYouTubeTranscript = `
        0:00
        welcome everyone to our lecture on artificial neural networks
        0:05
        today we will cover gradient descent and backpropagation
        0:12
        gradient descent is an optimization algorithm that minimizes the loss function
        0:20
        backpropagation calculates the gradient of the error with respect to each weight
        0:30
        learning rate is a critical hyperparameter that determines step size in optimization
      `;

      // Mock oEmbed fetch
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Lecture 5: Backpropagation & Neural Networks',
          author_name: 'CS Professor',
          thumbnail_url: 'https://i.ytimg.com/vi/test/hqdefault.jpg'
        })
      } as unknown as Response);

      // Mock synthesis
      vi.spyOn(synthesisService, 'synthesizeNotes').mockResolvedValueOnce({
        title: 'Lecture 5: Backpropagation & Neural Networks',
        summary: 'Detailed explanation of artificial neural networks, gradient descent, and backpropagation.',
        sections: [
          {
            heading: 'Optimization in Neural Networks',
            points: ['Gradient descent minimizes the objective loss function.', 'Learning rate dictates the step size taken.'],
            definitions: [
              {
                term: 'Gradient Descent',
                definition: 'An optimization algorithm that iteratively minimizes the loss function.'
              }
            ],
            exam_flag: 'Backpropagation derivation is a standard exam question.'
          }
        ]
      });

      const note = await pipelineService.createNoteFromUrl(
        'https://www.youtube.com/watch?v=aircAruvnKk',
        'Computer Science',
        undefined, // test auto-fetching title from oEmbed
        undefined,
        rawYouTubeTranscript
      );

      expect(note).toBeDefined();
      expect(note.sourceType).toBe('URL_VIDEO');
      expect(note.sourceUrl).toBe('https://www.youtube.com/watch?v=aircAruvnKk');
      expect(note.title).toBe('Lecture 5: Backpropagation & Neural Networks');
      expect(note.source).toBe('ai_generated');

      // Transcript verification
      const transcript = await storageService.getTranscript(note.transcriptId);
      expect(transcript).toBeDefined();
      expect(transcript?.status).toBe('COMPLETED');
      expect(transcript?.text).not.toContain('0:00');
      expect(transcript?.text).not.toContain('0:05');
      expect(transcript?.text).toContain('welcome everyone to our lecture on artificial neural networks');
      expect(transcript?.text).toContain('gradient descent is an optimization algorithm');
    });

    it('rejects providedTranscriptText that fails the §7 candidate gate (< 5 chars or placeholder)', async () => {
      await expect(
        pipelineService.createNoteFromUrl(
          'https://www.youtube.com/watch?v=aircAruvnKk',
          'Math',
          'Short transcript',
          undefined,
          'Hi'
        )
      ).rejects.toThrow(/too short/i);

      await expect(
        pipelineService.createNoteFromUrl(
          'https://www.youtube.com/watch?v=aircAruvnKk',
          'Math',
          'Placeholder transcript',
          undefined,
          'sample text'
        )
      ).rejects.toThrow(/placeholder/i);
    });
  });

  describe('YouTube Transcript Cleaning & Video Metadata', () => {
    it('cleans timestamps from raw YouTube transcript copy-paste', () => {
      const raw = `
        0:01
        hello students
        0:05
        today we discuss recursion
        1:23:45
        thank you for watching
      `;
      const cleaned = linkIngestionService.cleanTranscriptText(raw);
      expect(cleaned).toBe('hello students today we discuss recursion thank you for watching');
      expect(cleaned).not.toContain('0:01');
      expect(cleaned).not.toContain('0:05');
      expect(cleaned).not.toContain('1:23:45');
    });

    it('fetches video metadata via YouTube oEmbed', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'MIT 6.006 Intro to Algorithms',
          author_name: 'MIT OpenCourseWare',
          thumbnail_url: 'https://i.ytimg.com/vi/algorithms/hqdefault.jpg'
        })
      } as unknown as Response);

      const meta = await linkIngestionService.fetchVideoMetadata('https://www.youtube.com/watch?v=NLKQG0425ic');
      expect(meta).toBeDefined();
      expect(meta?.title).toBe('MIT 6.006 Intro to Algorithms');
      expect(meta?.authorName).toBe('MIT OpenCourseWare');
      expect(meta?.providerName).toBe('YouTube');
    });
  });
});
