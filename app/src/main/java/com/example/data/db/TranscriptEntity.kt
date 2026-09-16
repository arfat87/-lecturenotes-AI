package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.models.SourceType
import com.example.data.models.Transcript
import com.example.data.models.TranscriptStatus

@Entity(tableName = "transcripts")
data class TranscriptEntity(
    @PrimaryKey val id: String,
    val recordingId: String,
    val text: String,
    val language: String = "en",
    val durationSeconds: Long,
    val createdAt: Long,
    val status: String,
    val errorMessage: String? = null,
    val isEdited: Boolean = false,
    val originalTextRef: String? = null,
    val isDemo: Boolean = false,
    val sourceId: String? = null,
    val sourceType: String? = null,
    val sourceUrl: String? = null
) {
    fun toDomainModel(): Transcript {
        val statusEnum = try {
            TranscriptStatus.valueOf(status)
        } catch (e: Exception) {
            TranscriptStatus.COMPLETED
        }
        val sourceTypeEnum = sourceType?.let {
            try { SourceType.valueOf(it) } catch (e: Exception) { null }
        }
        return Transcript(
            id = id,
            recordingId = recordingId,
            text = text,
            language = language,
            durationSeconds = durationSeconds,
            createdAt = createdAt,
            status = statusEnum,
            errorMessage = errorMessage,
            isEdited = isEdited,
            originalTextRef = originalTextRef,
            isDemo = isDemo,
            sourceId = sourceId,
            sourceType = sourceTypeEnum,
            sourceUrl = sourceUrl
        )
    }

    companion object {
        fun fromDomainModel(tr: Transcript): TranscriptEntity {
            return TranscriptEntity(
                id = tr.id,
                recordingId = tr.recordingId,
                text = tr.text,
                language = tr.language,
                durationSeconds = tr.durationSeconds,
                createdAt = tr.createdAt,
                status = tr.status.name,
                errorMessage = tr.errorMessage,
                isEdited = tr.isEdited,
                originalTextRef = tr.originalTextRef,
                isDemo = tr.isDemo,
                sourceId = tr.sourceId,
                sourceType = tr.sourceType?.name,
                sourceUrl = tr.sourceUrl
            )
        }
    }
}

