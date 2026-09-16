import { StructuredNotes, Transcript, Recording } from '../types';

export class SynthesisService {
  private getApiKey(): string {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  /**
   * Synthesizes structured academic notes from a verified transcript.
   * Prohibits inventing missing facts outside the transcript.
   */
  async synthesizeNotes(
    recording: Recording,
    transcript: Transcript,
    onProgress?: (msg: string) => void
  ): Promise<StructuredNotes> {
    if (!transcript || !transcript.text || transcript.text.trim().length === 0) {
      throw new Error('Synthesis gate failed: Verified transcript is missing or empty.');
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    if (onProgress) onProgress('Gemini 2.0 Flash is analyzing transcript & synthesizing definitions...');

    const systemPrompt = `You are an academic lecture note synthesis engine.

Input: REAL VERBATIM TRANSCRIPT FROM A USER'S LECTURE RECORDING.

Task:
Convert ONLY the information present in the transcript into clean, structured academic study notes.

Rules:
1. Do NOT invent or hallucinate facts that were not spoken in the transcript.
2. Group points logically by topic or concept rather than purely chronological order.
3. Preserve all definitions, theorems, formulas, examples, and key facts spoken by the instructor.
4. If the instructor says "this will be on the exam", "remember this", or "test question", extract it into the "exam_flag" field.
5. If a technical term is mentioned, provide a one-line clarifying definition with "added_context" if appropriate.

Return STRICT JSON matching this schema:
{
  "title": "string",
  "summary": "string",
  "sections": [
    {
      "heading": "string",
      "points": ["string"],
      "definitions": [
        {
          "term": "string",
          "definition": "string",
          "added_context": "string or null"
        }
      ],
      "exam_flag": "string or null"
    }
  ]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const userMessage = `Course: "${recording.subject}"
Lecture Topic: "${recording.title}"

VERBATIM TRANSCRIPT:
"""
${transcript.text}
"""

Please synthesize structured academic notes from this transcript according to the rules.`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          parts: [{ text: userMessage }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Synthesis API error HTTP status:', response.status);
      throw new Error(`AI note synthesis failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawJson) {
      throw new Error('AI note synthesis produced an empty response.');
    }

    const cleanJson = rawJson.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const structuredNotes: StructuredNotes = JSON.parse(cleanJson);

      // Validate Note Schema
      if (!structuredNotes.title || !structuredNotes.summary || !Array.isArray(structuredNotes.sections)) {
        throw new Error('AI response JSON schema validation failed (missing title, summary, or sections).');
      }

      return structuredNotes;
    } catch (parseErr) {
      console.error('Failed to parse AI structured response schema');
      throw new Error('Failed to parse structured academic notes from AI response.');
    }
  }
}

export const synthesisService = new SynthesisService();
