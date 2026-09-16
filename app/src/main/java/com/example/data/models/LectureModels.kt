package com.example.data.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Definition(
    val term: String,
    val definition: String,
    val context: String = "",
    val added_context: String? = null
)

@JsonClass(generateAdapter = true)
data class NoteSection(
    val title: String = "",
    val coreConcept: String? = null,
    val definition: String? = null,
    val explanation: String? = null,
    val logicOrProcess: String? = null,
    val examples: List<String> = emptyList(),
    val importantPoints: List<String> = emptyList(),
    // Backwards compatibility with legacy fixtures and screens
    val heading: String = "",
    val points: List<String> = emptyList(),
    val definitions: List<Definition> = emptyList(),
    val exam_flag: String? = null
) {
    val displayTitle: String get() = if (title.isNotBlank()) title else heading
    val allPoints: List<String> get() = if (importantPoints.isNotEmpty()) importantPoints else points
}

@JsonClass(generateAdapter = true)
data class ExampleGlobal(
    val example: String = "",
    val explanation: String = "",
    val conceptDemonstrated: String = ""
)

@JsonClass(generateAdapter = true)
data class Formula(
    val formula: String = "",
    val meaning: String = "",
    val variables: List<String> = emptyList(),
    val context: String = ""
)

@JsonClass(generateAdapter = true)
data class ExamAlert(
    val topic: String = "",
    val reason: String = "",
    val evidence: String = ""
)

@JsonClass(generateAdapter = true)
data class QuestionsMentioned(
    val lecturerQuestions: List<String> = emptyList(),
    val studentQuestions: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class StructuredNotes(
    val title: String = "",
    val summary: String = "",
    val keyTakeaways: List<String> = emptyList(),
    val sections: List<NoteSection> = emptyList(),
    val definitions: List<Definition> = emptyList(),
    val examplesGlobal: List<ExampleGlobal> = emptyList(),
    val formulas: List<Formula> = emptyList(),
    val importantFacts: List<String> = emptyList(),
    val examAlerts: List<ExamAlert> = emptyList(),
    val questionsMentioned: QuestionsMentioned = QuestionsMentioned(),
    val actionItems: List<String> = emptyList(),
    val unclearPoints: List<String> = emptyList()
)

enum class SourceType {
    AUDIO_RECORDING,
    URL_VIDEO,
    URL_AUDIO,
    URL_ARTICLE
}

enum class RecordingStatus {
    IDLE,
    RECORDING,
    PAUSED,
    STOPPED,
    FETCHING,
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
    FETCHING,
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
    val audioPath: String = "",
    val durationSeconds: Long,
    val fileSizeBytes: Long = 0,
    val createdAt: Long,
    val status: RecordingStatus = RecordingStatus.STOPPED,
    val errorMessage: String? = null,
    val transcriptId: String? = null,
    val noteId: String? = null,
    val isDemo: Boolean = false,
    val sourceType: SourceType = SourceType.AUDIO_RECORDING,
    val sourceUrl: String? = null
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
    val isDemo: Boolean = false,
    val sourceId: String? = null,
    val sourceType: SourceType? = null,
    val sourceUrl: String? = null
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
    val isDemo: Boolean = false,
    val sourceId: String? = null,
    val sourceType: SourceType? = null,
    val sourceUrl: String? = null
) {
    val content: StructuredNotes get() = structuredNotes
}

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

