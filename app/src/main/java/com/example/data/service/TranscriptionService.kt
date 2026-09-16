package com.example.data.service

import android.util.Base64
import com.example.api.Content
import com.example.api.GeminiClient
import com.example.api.GenerateContentRequest
import com.example.api.GenerationConfig
import com.example.api.InlineData
import com.example.api.Part
import com.example.data.models.Recording
import com.example.data.models.Transcript
import com.example.data.models.TranscriptStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID

class TranscriptionService {

    /**
     * Stage 1: Converts genuine audio recording into verbatim transcript text.
     * Guaranteed: Fails explicitly if audio is missing, corrupt, or yields no speech.
     */
    suspend fun transcribeRecording(
        recording: Recording,
        audioFile: File?,
        onProgress: (String) -> Unit = {}
    ): Transcript = withContext(Dispatchers.IO) {
        // 1. Audio validation
        onProgress("Validating audio recording file...")
        if (audioFile == null || !audioFile.exists() || audioFile.length() == 0L) {
            throw IllegalStateException("Cannot transcribe: Audio file is missing or empty (0 bytes).")
        }

        if (recording.durationSeconds <= 0L) {
            throw IllegalStateException("Cannot transcribe: Recording duration is 0 seconds.")
        }

        val apiKey = GeminiClient.getApiKey()
        if (apiKey.isBlank()) {
            throw IllegalStateException("Gemini API key is missing. Please set GEMINI_API_KEY in .env.")
        }

        onProgress("Uploading audio bytes to Gemini 2.0 Flash for speech transcription...")
        val audioBytes = audioFile.readBytes()
        val mimeType = if (audioFile.name.endsWith(".mp3", true)) "audio/mp3" else "audio/mp4"
        val base64Audio = Base64.encodeToString(audioBytes, Base64.NO_WRAP)

        val systemPrompt = """
            You are a professional verbatim speech-to-text transcriber for academic university lectures.
            Your task is to transcribe the provided audio recording into accurate, verbatim text.
            
            Strict Transcription Rules:
            1. Transcribe ONLY the words spoken in the audio recording.
            2. Do not invent, hallucinate, assume, or summarize content not present in the audio.
            3. Preserve technical terms, formulas, course names, and exam warnings exactly as spoken.
            4. If speech is unintelligible at moments, transcribe as best as possible without fabricating content.
            5. Return the raw transcript as plain text. Do not wrap in JSON or Markdown blocks.
        """.trimIndent()

        val request = GenerateContentRequest(
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt))),
            contents = listOf(
                Content(
                    parts = listOf(
                        Part(text = "Transcribe this lecture audio accurately: subject '${recording.subject}', topic '${recording.title}'"),
                        Part(inlineData = InlineData(mimeType = mimeType, data = base64Audio))
                    )
                )
            ),
            generationConfig = GenerationConfig(
                responseMimeType = "text/plain",
                temperature = 0.1f
            )
        )

        onProgress("Transcribing spoken lecture audio to verbatim text...")
        val response = GeminiClient.apiService.generateContent(apiKey, request)
        val transcriptText = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text?.trim()

        if (transcriptText.isNullOrBlank()) {
            throw IllegalStateException("Transcription failed: Gemini returned an empty transcript. Speech could not be detected.")
        }

        val transcriptId = "tr_" + UUID.randomUUID().toString().take(8)
        return@withContext Transcript(
            id = transcriptId,
            recordingId = recording.id,
            text = transcriptText,
            language = "en",
            durationSeconds = recording.durationSeconds,
            createdAt = System.currentTimeMillis(),
            status = TranscriptStatus.COMPLETED,
            isEdited = false,
            originalTextRef = null,
            isDemo = recording.isDemo
        )
    }
}
