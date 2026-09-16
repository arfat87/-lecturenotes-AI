package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.models.Recording
import com.example.data.models.RecordingStatus
import com.example.data.models.SourceType

@Entity(tableName = "recordings")
data class RecordingEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val subject: String,
    val title: String,
    val audioPath: String,
    val durationSeconds: Long,
    val fileSizeBytes: Long,
    val createdAt: Long,
    val status: String,
    val errorMessage: String? = null,
    val transcriptId: String? = null,
    val noteId: String? = null,
    val sourceType: String = "AUDIO_RECORDING",
    val sourceUrl: String? = null
) {
    fun toDomainModel(): Recording {
        val statusEnum = try {
            RecordingStatus.valueOf(status)
        } catch (e: Exception) {
            RecordingStatus.STOPPED
        }
        val sourceTypeEnum = try {
            SourceType.valueOf(sourceType)
        } catch (e: Exception) {
            SourceType.AUDIO_RECORDING
        }
        return Recording(
            id = id,
            userId = userId,
            subject = subject,
            title = title,
            audioPath = audioPath,
            durationSeconds = durationSeconds,
            fileSizeBytes = fileSizeBytes,
            createdAt = createdAt,
            status = statusEnum,
            errorMessage = errorMessage,
            transcriptId = transcriptId,
            noteId = noteId,
            sourceType = sourceTypeEnum,
            sourceUrl = sourceUrl
        )
    }

    companion object {
        fun fromDomainModel(rec: Recording): RecordingEntity {
            return RecordingEntity(
                id = rec.id,
                userId = rec.userId,
                subject = rec.subject,
                title = rec.title,
                audioPath = rec.audioPath,
                durationSeconds = rec.durationSeconds,
                fileSizeBytes = rec.fileSizeBytes,
                createdAt = rec.createdAt,
                status = rec.status.name,
                errorMessage = rec.errorMessage,
                transcriptId = rec.transcriptId,
                noteId = rec.noteId,
                sourceType = rec.sourceType.name,
                sourceUrl = rec.sourceUrl
            )
        }
    }
}

