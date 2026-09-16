package com.example.data.repository

import android.content.Context
import com.example.api.GeminiClient
import com.example.data.db.LectureDao
import com.example.data.db.LectureDatabase
import com.example.data.db.NoteEntity
import com.example.data.db.RecordingEntity
import com.example.data.db.TranscriptEntity
import com.example.data.fixtures.DemoFixtures
import com.example.data.models.Note
import com.example.data.models.ProcessingJob
import com.example.data.models.ProcessingStage
import com.example.data.models.Recording
import com.example.data.models.RecordingStatus
import com.example.data.models.StructuredNotes
import com.example.data.models.Transcript
import com.example.data.models.UserAccount
import com.example.data.service.SynthesisService
import com.example.data.service.TranscriptionService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Collections
import java.util.Date
import java.util.Locale
import java.util.UUID

class LectureRepository(
    private val context: Context,
    private val dao: LectureDao = LectureDatabase.getDatabase(context).lectureDao(),
    private val transcriptionService: TranscriptionService = TranscriptionService(),
    private val synthesisService: SynthesisService = SynthesisService()
) {
    private val moshi = GeminiClient.moshi
    private val activeJobs = Collections.synchronizedSet(mutableSetOf<String>())

    private val _currentUser = MutableStateFlow(
        UserAccount(
            userId = "usr_101",
            name = "Alex Vance",
            email = "alex.vance@stanford.edu",
            college = "Stanford University"
        )
    )
    val currentUser: StateFlow<UserAccount> = _currentUser.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(true)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    val allNotes: Flow<List<Note>> = dao.getAllNotes().map { entities ->
        entities.map { it.toDomainModel(moshi) }
    }

    val allRecordings: Flow<List<Recording>> = dao.getAllRecordings().map { entities ->
        entities.map { it.toDomainModel() }
    }

    fun searchNotes(query: String): Flow<List<Note>> {
        return dao.searchNotes(query).map { entities ->
            entities.map { it.toDomainModel(moshi) }
        }
    }

    suspend fun getNoteById(id: String): Note? {
        return dao.getNoteById(id)?.toDomainModel(moshi)
    }

    suspend fun saveNote(note: Note) {
        val entity = NoteEntity.fromDomainModel(note, moshi)
        dao.insertNote(entity)
    }

    suspend fun updateNote(note: Note) {
        val entity = NoteEntity.fromDomainModel(note, moshi)
        dao.updateNote(entity)
    }

    suspend fun deleteNote(id: String) {
        dao.deleteNote(id)
    }

    suspend fun getRecordingById(id: String): Recording? {
        return dao.getRecordingById(id)?.toDomainModel()
    }

    suspend fun saveRecording(recording: Recording) {
        val entity = RecordingEntity.fromDomainModel(recording)
        dao.insertRecording(entity)
    }

    suspend fun deleteRecording(id: String) {
        val rec = dao.getRecordingById(id)
        if (rec != null) {
            try {
                if (rec.audioPath.isNotBlank()) {
                    val file = File(rec.audioPath)
                    if (file.exists()) file.delete()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            dao.deleteRecording(id)
            if (!rec.transcriptId.isNullOrBlank()) {
                dao.deleteTranscript(rec.transcriptId)
            }
        }
    }

    fun login(email: String, name: String) {
        _currentUser.value = UserAccount(
            userId = UUID.randomUUID().toString().take(8),
            name = if (name.isNotBlank()) name else "University Student",
            email = email,
            college = "Stanford University"
        )
        _isLoggedIn.value = true
    }

    fun logout() {
        _isLoggedIn.value = false
    }

    /**
     * Absolute Core Mandate Pipeline:
     * 1. Audio validation -> 2. Transcription -> 3. Verified Transcript -> 4. Synthesis -> 5. Structured Note
     * Zero fake note fallbacks. Audio is preserved permanently in local storage on failure.
     */
    suspend fun createNoteFromRecording(
        recordingId: String,
        onJobUpdate: (ProcessingJob) -> Unit = {}
    ): Note = withContext(Dispatchers.IO) {
        if (activeJobs.contains(recordingId)) {
            throw IllegalStateException("A processing job is already running for recording: $recordingId")
        }
        activeJobs.add(recordingId)

        val updateJob = { stage: ProcessingStage, msg: String, err: String? ->
            onJobUpdate(ProcessingJob(recordingId, stage, msg, err))
        }

        try {
            updateJob(ProcessingStage.VALIDATING, "Validating recording audio file...", null)

            val recEntity = dao.getRecordingById(recordingId)
                ?: throw IllegalStateException("Recording $recordingId not found in local database.")
            val recording = recEntity.toDomainModel()

            // Return existing note if already processed
            if (!recording.noteId.isNullOrBlank()) {
                val existing = getNoteById(recording.noteId)
                if (existing != null) {
                    activeJobs.remove(recordingId)
                    return@withContext existing
                }
            }

            val audioFile = File(recording.audioPath)
            if (!audioFile.exists() || audioFile.length() == 0L) {
                throw IllegalStateException("Audio file does not exist or has 0 bytes. Please record the lecture again.")
            }
            if (recording.durationSeconds <= 0L) {
                throw IllegalStateException("Recording duration is invalid (0 seconds).")
            }

            // Stage 1: Transcription
            val updatedRecTranscribing = recording.copy(status = RecordingStatus.TRANSCRIBING, errorMessage = null)
            saveRecording(updatedRecTranscribing)
            updateJob(ProcessingStage.TRANSCRIBING, "Transcribing spoken lecture audio to verbatim text...", null)

            val transcript = transcriptionService.transcribeRecording(
                recording = updatedRecTranscribing,
                audioFile = audioFile,
                onProgress = { msg -> updateJob(ProcessingStage.TRANSCRIBING, msg, null) }
            )

            if (transcript.text.isBlank()) {
                throw IllegalStateException("Transcription failed: Speech could not be recognized from audio.")
            }

            // Save Transcript in Room
            dao.insertTranscript(TranscriptEntity.fromDomainModel(transcript))

            // Stage 2: Synthesis
            val updatedRecSynthesizing = updatedRecTranscribing.copy(
                status = RecordingStatus.SYNTHESIZING,
                transcriptId = transcript.id
            )
            saveRecording(updatedRecSynthesizing)
            updateJob(ProcessingStage.SYNTHESIZING, "Synthesizing structured study notes, definitions & exam highlights...", null)

            val structuredNotes = synthesisService.synthesizeNotes(
                recording = updatedRecSynthesizing,
                transcript = transcript,
                onProgress = { msg -> updateJob(ProcessingStage.SYNTHESIZING, msg, null) }
            )

            val currentDate = SimpleDateFormat("MMM dd, yyyy", Locale.US).format(Date(recording.createdAt))
            val mins = recording.durationSeconds / 60
            val formattedDuration = if (recording.durationSeconds > 0) {
                if (mins == 0L) "${recording.durationSeconds}s" else "$mins mins"
            } else "45 mins"

            val noteId = "note_" + UUID.randomUUID().toString().take(8)
            val note = Note(
                id = noteId,
                recordingId = recording.id,
                transcriptId = transcript.id,
                userId = recording.userId,
                subject = recording.subject,
                title = if (structuredNotes.title.isNotBlank()) structuredNotes.title else recording.title,
                date = currentDate,
                durationFormatted = formattedDuration,
                durationSeconds = recording.durationSeconds,
                transcriptText = transcript.text,
                structuredNotes = structuredNotes,
                aiOriginalNotes = structuredNotes,
                userEditedNotes = null,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis(),
                isDemo = false
            )

            saveNote(note)

            val completedRecording = updatedRecSynthesizing.copy(
                status = RecordingStatus.COMPLETED,
                noteId = note.id
            )
            saveRecording(completedRecording)

            updateJob(ProcessingStage.COMPLETED, "Notes ready!", null)
            return@withContext note
        } catch (e: Exception) {
            e.printStackTrace()
            val errorMsg = e.localizedMessage ?: "Note creation pipeline failed."

            // Preserve recording in FAILED status with audio intact
            val rec = dao.getRecordingById(recordingId)?.toDomainModel()
            if (rec != null) {
                val failedRec = rec.copy(status = RecordingStatus.FAILED, errorMessage = errorMsg)
                saveRecording(failedRec)
            }

            updateJob(ProcessingStage.FAILED, "Pipeline failed.", errorMsg)
            throw e
        } finally {
            activeJobs.remove(recordingId)
        }
    }

    suspend fun retryProcessing(
        recordingId: String,
        onJobUpdate: (ProcessingJob) -> Unit = {}
    ): Note {
        return createNoteFromRecording(recordingId, onJobUpdate)
    }

    suspend fun regenerateNote(noteId: String): Note = withContext(Dispatchers.IO) {
        val note = getNoteById(noteId) ?: throw IllegalStateException("Note $noteId not found.")
        val recording = getRecordingById(note.recordingId) ?: throw IllegalStateException("Source recording ${note.recordingId} not found.")
        val transcriptEntity = dao.getTranscriptById(note.transcriptId) ?: throw IllegalStateException("Source transcript ${note.transcriptId} not found.")
        val transcript = transcriptEntity.toDomainModel()

        val freshStructuredNotes = synthesisService.synthesizeNotes(recording, transcript)

        val updatedNote = note.copy(
            title = freshStructuredNotes.title.ifBlank { note.title },
            structuredNotes = freshStructuredNotes,
            aiOriginalNotes = freshStructuredNotes,
            userEditedNotes = null,
            updatedAt = System.currentTimeMillis()
        )

        saveNote(updatedNote)
        return@withContext updatedNote
    }

    suspend fun seedDemoFixturesIfEmpty() = withContext(Dispatchers.IO) {
        val existingNotes = dao.getAllNotes().firstOrNull() ?: emptyList()
        val existingRecs = dao.getAllRecordings().firstOrNull() ?: emptyList()

        if (existingNotes.isEmpty() && existingRecs.isEmpty()) {
            for (rec in DemoFixtures.ALL_DEMO_RECORDINGS) {
                dao.insertRecording(RecordingEntity.fromDomainModel(rec))
            }
            for (tr in DemoFixtures.ALL_DEMO_TRANSCRIPTS) {
                dao.insertTranscript(TranscriptEntity.fromDomainModel(tr))
            }
            for (note in DemoFixtures.ALL_DEMO_NOTES) {
                dao.insertNote(NoteEntity.fromDomainModel(note, moshi))
            }
        }
    }
}
