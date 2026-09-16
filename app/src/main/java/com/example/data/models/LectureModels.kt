package com.example.data.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Definition(
    val term: String,
    val definition: String,
    val added_context: String? = null
)

@JsonClass(generateAdapter = true)
data class NoteSection(
    val heading: String,
    val points: List<String> = emptyList(),
    val definitions: List<Definition> = emptyList(),
    val exam_flag: String? = null
)

@JsonClass(generateAdapter = true)
data class StructuredNotes(
    val title: String,
    val summary: String,
    val sections: List<NoteSection> = emptyList()
)

enum class RecordingStatus {
    IDLE,
    RECORDING,
    PAUSED,
    STOPPED,
    VALIDATING,
    TRANSCRIBING,
    SYNTHESIZING,
    COMPLETED,
    FAILED
}

enum class ProcessingStage {
    VALIDATING,
    TRANSCRIBING,
    SYNTHESIZING,
    COMPLETED,
    FAILED
}

enum class TranscriptStatus {
    PENDING,
    VALIDATING,
    TRANSCRIBING,
    COMPLETED,
    FAILED
}

data class Recording(
    val id: String,
    val userId: String,
    val subject: String,
    val title: String,
    val audioPath: String,
    val durationSeconds: Long,
    val fileSizeBytes: Long,
    val createdAt: Long,
    val status: RecordingStatus = RecordingStatus.STOPPED,
    val errorMessage: String? = null,
    val transcriptId: String? = null,
    val noteId: String? = null,
    val isDemo: Boolean = false
)

data class Transcript(
    val id: String,
    val recordingId: String,
    val text: String,
    val language: String = "en",
    val durationSeconds: Long,
    val createdAt: Long,
    val status: TranscriptStatus = TranscriptStatus.COMPLETED,
    val errorMessage: String? = null,
    val isEdited: Boolean = false,
    val originalTextRef: String? = null,
    val isDemo: Boolean = false
)

data class Note(
    val id: String,
    val recordingId: String,
    val transcriptId: String,
    val userId: String,
    val subject: String,
    val title: String,
    val date: String,
    val durationFormatted: String = "45 mins",
    val durationSeconds: Long = 0,
    val transcriptText: String = "",
    val structuredNotes: StructuredNotes,
    val aiOriginalNotes: StructuredNotes,
    val userEditedNotes: StructuredNotes? = null,
    val source: String = "ai_generated",
    val version: Int = 1,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDemo: Boolean = false
)

data class ProcessingJob(
    val recordingId: String,
    val stage: ProcessingStage,
    val progressMessage: String,
    val error: String? = null
)

data class UserAccount(
    val userId: String,
    val name: String,
    val email: String,
    val college: String = "Stanford University"
)

