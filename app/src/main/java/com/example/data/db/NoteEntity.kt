package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.models.Note
import com.example.data.models.StructuredNotes
import com.squareup.moshi.Moshi

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey val id: String,
    val recordingId: String,
    val transcriptId: String,
    val userId: String,
    val subject: String,
    val title: String,
    val date: String,
    val durationFormatted: String,
    val durationSeconds: Long,
    val transcriptText: String,
    val structuredNotesJson: String,
    val aiOriginalNotesJson: String,
    val userEditedNotesJson: String? = null,
    val source: String = "ai_generated",
    val version: Int = 1,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDemo: Boolean = false
) {
    fun toDomainModel(moshi: Moshi): Note {
        val adapter = moshi.adapter(StructuredNotes::class.java)
        val structured = try {
            adapter.fromJson(structuredNotesJson) ?: StructuredNotes(title, "")
        } catch (e: Exception) {
            StructuredNotes(title, "")
        }
        val aiOriginal = try {
            adapter.fromJson(aiOriginalNotesJson) ?: structured
        } catch (e: Exception) {
            structured
        }
        val userEdited = try {
            userEditedNotesJson?.let { adapter.fromJson(it) }
        } catch (e: Exception) {
            null
        }

        return Note(
            id = id,
            recordingId = recordingId,
            transcriptId = transcriptId,
            userId = userId,
            subject = subject,
            title = title,
            date = date,
            durationFormatted = durationFormatted,
            durationSeconds = durationSeconds,
            transcriptText = transcriptText,
            structuredNotes = structured,
            aiOriginalNotes = aiOriginal,
            userEditedNotes = userEdited,
            source = source,
            version = version,
            createdAt = createdAt,
            updatedAt = updatedAt,
            isDemo = isDemo
        )
    }

    companion object {
        fun fromDomainModel(note: Note, moshi: Moshi): NoteEntity {
            val adapter = moshi.adapter(StructuredNotes::class.java)
            val structuredJson = adapter.toJson(note.structuredNotes)
            val aiOriginalJson = adapter.toJson(note.aiOriginalNotes)
            val userEditedJson = note.userEditedNotes?.let { adapter.toJson(it) }

            return NoteEntity(
                id = note.id,
                recordingId = note.recordingId,
                transcriptId = note.transcriptId,
                userId = note.userId,
                subject = note.subject,
                title = note.title,
                date = note.date,
                durationFormatted = note.durationFormatted,
                durationSeconds = note.durationSeconds,
                transcriptText = note.transcriptText,
                structuredNotesJson = structuredJson,
                aiOriginalNotesJson = aiOriginalJson,
                userEditedNotesJson = userEditedJson,
                source = note.source,
                version = note.version,
                createdAt = note.createdAt,
                updatedAt = note.updatedAt,
                isDemo = note.isDemo
            )
        }
    }
}
