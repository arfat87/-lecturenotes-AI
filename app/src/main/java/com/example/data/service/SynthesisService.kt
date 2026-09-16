package com.example.data.service

import com.example.api.Content
import com.example.api.GeminiClient
import com.example.api.GenerateContentRequest
import com.example.api.GenerationConfig
import com.example.api.Part
import com.example.data.models.Recording
import com.example.data.models.StructuredNotes
import com.example.data.models.Transcript
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SynthesisService {

    private val moshi = GeminiClient.moshi

    /**
     * Stage 2: Synthesizes structured study notes strictly from a verified spoken transcript.
     * Guaranteed: Fails explicitly if transcript is missing or synthesis fails.
     */
    suspend fun synthesizeNotes(
        recording: Recording,
        transcript: Transcript,
        onProgress: (String) -> Unit = {}
    ): StructuredNotes = withContext(Dispatchers.IO) {
        onProgress("Validating transcript text...")
        if (transcript.text.isBlank()) {
            throw IllegalStateException("Cannot synthesize notes: Transcript text is empty.")
        }

        val apiKey = GeminiClient.getApiKey()
        if (apiKey.isBlank()) {
            throw IllegalStateException("Gemini API key is missing. Please set GEMINI_API_KEY in .env.")
        }

        onProgress("Synthesizing structured notes, definitions & exam highlights with Gemini 2.0 Flash...")

        val systemPrompt = """
            You are an expert academic note synthesizer. You convert verified spoken lecture transcripts into high-yield structured study notes.

            Strict Academic Synthesis Rules:
            1. All points, concepts, and formulas MUST be derived directly from the provided transcript.
            2. Do NOT invent concepts, facts, or definitions not mentioned or implied by the transcript.
            3. Group logically by topic/concept rather than chronological speech order.
            4. Extract every definition stated. If a technical term was used without an explicit definition, provide a concise clarification marked with "added_context".
            5. Flag all exam warnings ("this is on the test", "remember this formula", "midterm alert") in the exam_flag field.
            6. Produce clean, executive summaries and bullet points.

            JSON Output Schema:
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
            }
        """.trimIndent()

        val userPrompt = """
            Course Subject: ${recording.subject}
            Lecture Title: ${recording.title}

            VERIFIED RAW SPOKEN TRANSCRIPT:
            ${transcript.text}
        """.trimIndent()

        val request = GenerateContentRequest(
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt))),
            contents = listOf(
                Content(parts = listOf(Part(text = userPrompt)))
            ),
            generationConfig = GenerationConfig(
                responseMimeType = "application/json",
                temperature = 0.2f
            )
        )

        val response = GeminiClient.apiService.generateContent(apiKey, request)
        val jsonResponse = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text

        if (jsonResponse.isNullOrBlank()) {
            throw IllegalStateException("Synthesis failed: Gemini returned an empty response.")
        }

        val cleanJson = jsonResponse.trim()
            .removePrefix("```json")
            .removePrefix("```JSON")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()

        val adapter = moshi.adapter(StructuredNotes::class.java)
        val structuredNotes = try {
            adapter.fromJson(cleanJson)
        } catch (e: Exception) {
            throw IllegalStateException("Failed to parse synthesized notes JSON: ${e.message}", e)
        }

        if (structuredNotes == null || structuredNotes.sections.isEmpty()) {
            throw IllegalStateException("Note synthesis produced an invalid or empty note structure.")
        }

        return@withContext structuredNotes
    }
}
