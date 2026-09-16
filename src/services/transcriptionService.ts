import { Recording, Transcript } from '../types';

export class TranscriptionService {
  private getApiKey(): string {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Strictly converts verified lecture audio into a faithful text transcript.
   * NEVER generates study notes, summaries, or exam questions.
   */
  async transcribeRecording(
    recording: Recording,
    audioBlob: Blob,
    onProgress?: (msg: string) => void
  ): Promise<Transcript> {
    // 1. Audio Validation
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Audio validation failed: Recording contains 0 bytes of audio.');
    }
    if (recording.durationSeconds <= 0) {
      throw new Error('Audio validation failed: Recording duration is invalid (0 seconds).');
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env.');
    }

    if (onProgress) onProgress('Encoding audio stream for Gemini Speech Transcription...');
    const base64Audio = await this.blobToBase64(audioBlob);
    const mimeType = audioBlob.type || recording.audioMimeType || 'audio/webm';

    if (onProgress) onProgress('Transcribing spoken lecture audio to verbatim text...');

    const systemPrompt = `You are a faithful speech-to-text transcription engine for academic university lectures.

Your task:
- Convert the spoken audio recording into an accurate, complete, verbatim text transcript.
- Preserve all technical terminology, mathematical terms, proper names, numbers, definitions, and spoken examples.
- Use natural sentence punctuation and paragraph breaks.
- If audio is unclear, output "[inaudible]".
- DO NOT generate study notes, summaries, bullet points, study guides, or exam questions.
- Output ONLY the raw spoken text transcript.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          parts: [
            { text: `Please transcribe the audio from this lecture on "${recording.subject} - ${recording.title}". Output only the verbatim spoken transcript.` },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Transcription API error:', response.status, errBody);
      throw new Error(`Transcription service failed (HTTP ${response.status}). Please check network connection and API key.`);
    }

    const data = await response.json();
    const transcriptText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // 2. Transcript Validation
    if (!transcriptText || transcriptText.trim().length === 0) {
      throw new Error('Transcription completed but produced empty text. The lecture audio may be silent or corrupted.');
    }

    const transcript: Transcript = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recordingId: recording.id,
      text: transcriptText.trim(),
      language: 'en',
      durationSeconds: recording.durationSeconds,
      createdAt: Date.now(),
      status: 'COMPLETED'
    };

    return transcript;
  }
}

export const transcriptionService = new TranscriptionService();
