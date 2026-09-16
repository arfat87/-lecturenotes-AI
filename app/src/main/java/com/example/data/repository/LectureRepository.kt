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
import com.example.data.models.TranscriptStatus
import com.example.data.models.UserAccount
import com.example.data.models.SourceType
import com.example.data.service.LinkIngestionService
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
    private val synthesisService: SynthesisService = SynthesisService(),
    private val linkIngestionService: LinkIngestionService = LinkIngestionService()
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

    data class ValidationResult(val isValid: Boolean, val error: String? = null)

    companion object {
        private val KNOWN_PLACEHOLDERS = listOf(
            "test",
            "sample transcript",
            "lorem ipsum",
            "demo lecture",
            "sample text",
            "placeholder",
            "test lecture",
            "fake transcript"
        )

        fun canTranscribe(
            recording: Recording?,
            audioFile: File?,
            currentUser: UserAccount? = null
        ): ValidationResult {
            if (recording == null) {
                return ValidationResult(false, "Recording does not exist in local database.")
            }
            if (currentUser != null && recording.userId != currentUser.userId) {
                return ValidationResult(false, "Recording does not belong to the current user.")
            }
            if (audioFile == null || !audioFile.exists() || audioFile.length() == 0L) {
                return ValidationResult(false, "Audio file does not exist or has 0 bytes. Please record the lecture again.")
            }
            if (recording.durationSeconds <= 0L) {
                return ValidationResult(false, "Recording duration is invalid (0 seconds).")
            }
            if (recording.durationSeconds > 7200L) {
                return ValidationResult(false, "Recording duration exceeds maximum limit of 2 hours.")
            }
            if (recording.status == RecordingStatus.TRANSCRIBING) {
                return ValidationResult(false, "Recording is already being transcribed.")
            }
            return ValidationResult(true)
        }

        fun validateTranscriptText(text: String?, isDemo: Boolean = false): ValidationResult {
            if (text.isNullOrBlank()) {
                return ValidationResult(false, "Transcript is empty. Lecture speech could not be recognized.")
            }
            val trimmed = text.trim()
            if (!isDemo) {
                val lower = trimmed.lowercase(Locale.ROOT)
                val isPlaceholder = KNOWN_PLACEHOLDERS.any { ph ->
                    lower == ph || lower == "$ph." || lower.startsWith("$ph:")
                }
                if (isPlaceholder) {
                    return ValidationResult(false, "Transcript failed validation: Text appears to be placeholder or fixture data.")
                }
            }
            if (trimmed.length < 5) {
                return ValidationResult(false, "Transcript is too short to be a valid lecture recording.")
            }
            return ValidationResult(true)
        }

        fun canGenerateNote(
            recording: Recording?,
            transcript: Transcript?,
            activeJobs: Set<String>? = null
        ): ValidationResult {
            if (recording == null) {
                return ValidationResult(false, "Recording does not exist.")
            }
            if (activeJobs != null && activeJobs.contains(recording.id)) {
                return ValidationResult(false, "A note generation job is already active for recording ${recording.id}.")
            }
            if (recording.durationSeconds <= 0L) {
                return ValidationResult(false, "Recording duration is invalid.")
            }
            if (transcript == null) {
                return ValidationResult(false, "Transcript does not exist.")
            }
            if (transcript.status != com.example.data.models.TranscriptStatus.COMPLETED) {
                return ValidationResult(false, "Transcript is not COMPLETED (current status: ${transcript.status}).")
            }
            if (transcript.recordingId != recording.id) {
                return ValidationResult(false, "Transcript recordingId does not match the current recording.")
            }
            val textCheck = validateTranscriptText(transcript.text, transcript.isDemo || recording.isDemo)
            if (!textCheck.isValid) {
                return textCheck
            }
            return ValidationResult(true)
        }
    }

    fun isJobActive(recordingId: String): Boolean = activeJobs.contains(recordingId)

    /**
     * Absolute Core Mandate Pipeline (Master Prompt v2):
     * 1. Audio validation (§5) -> 2. Transcription (Stage 1) -> 3. §7 Candidate Transcript Gate
     * -> 4. Persist Transcript -> 5. §8 Note Gate -> 6. Synthesis (Stage 2) -> 7. Structured Note
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
            val preflight = canTranscribe(recording, audioFile, currentUser.value)
            if (!preflight.isValid) {
                throw IllegalStateException(preflight.error ?: "Recording pre-flight validation failed.")
            }

            // Check if a valid COMPLETED transcript already exists (§9 reuse on retry)
            var transcript: Transcript? = null
            if (!recording.transcriptId.isNullOrBlank()) {
                val existingTrEntity = dao.getTranscriptById(recording.transcriptId)
                if (existingTrEntity != null) {
                    val existingTr = existingTrEntity.toDomainModel()
                    if (existingTr.status == com.example.data.models.TranscriptStatus.COMPLETED &&
                        validateTranscriptText(existingTr.text, recording.isDemo).isValid
                    ) {
                        transcript = existingTr
                    }
                }
            }

            // Stage 1: Transcription (if not already verified and COMPLETED)
            if (transcript == null) {
                val updatedRecTranscribing = recording.copy(status = RecordingStatus.TRANSCRIBING, errorMessage = null)
                saveRecording(updatedRecTranscribing)
                updateJob(ProcessingStage.TRANSCRIBING, "Transcribing spoken lecture audio to verbatim text...", null)

                val candidate = transcriptionService.transcribeRecording(
                    recording = updatedRecTranscribing,
                    audioFile = audioFile,
                    onProgress = { msg -> updateJob(ProcessingStage.TRANSCRIBING, msg, null) }
                )

                // §7 Candidate Transcript Validation Gate
                val textValidation = validateTranscriptText(candidate.text, recording.isDemo)
                if (!textValidation.isValid) {
                    val failedTranscript = candidate.copy(
                        status = com.example.data.models.TranscriptStatus.FAILED,
                        errorMessage = textValidation.error,
                        isDemo = recording.isDemo
                    )
                    dao.insertTranscript(TranscriptEntity.fromDomainModel(failedTranscript))

                    val failedRec = updatedRecTranscribing.copy(
                        status = RecordingStatus.FAILED,
                        transcriptId = failedTranscript.id,
                        errorMessage = textValidation.error
                    )
                    saveRecording(failedRec)

                    throw IllegalStateException(textValidation.error ?: "Transcription produced invalid text.")
                }

                // Persist COMPLETED Transcript BEFORE Stage 2 synthesis
                val verifiedTranscript = candidate.copy(
                    status = com.example.data.models.TranscriptStatus.COMPLETED,
                    errorMessage = null,
                    isDemo = recording.isDemo,
                    isEdited = false,
                    originalTextRef = null
                )
                dao.insertTranscript(TranscriptEntity.fromDomainModel(verifiedTranscript))
                transcript = verifiedTranscript

                val updatedRecAfterTr = updatedRecTranscribing.copy(
                    transcriptId = verifiedTranscript.id
                )
                saveRecording(updatedRecAfterTr)
            }

            // §8 Note-Generation Gate Check
            val noteGate = canGenerateNote(recording, transcript)
            if (!noteGate.isValid) {
                throw IllegalStateException(noteGate.error ?: "Note generation gate check failed.")
            }

            // Stage 2: Synthesis (strictly takes verified transcript as input)
            val updatedRecSynthesizing = recording.copy(
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
                sourceId = recording.id,
                sourceType = recording.sourceType,
                sourceUrl = recording.sourceUrl,
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
                source = "ai_generated",
                version = 1,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis(),
                isDemo = recording.isDemo
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
            val errorMsg = e.localizedMessage ?: "Note creation pipeline failed."

            // Preserve recording in FAILED status with audio intact (§9)
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
        val rec = getRecordingById(recordingId)
        if (rec != null && !rec.sourceUrl.isNullOrBlank()) {
            return createNoteFromUrl(rec.sourceUrl, rec.subject, rec.title, onJobUpdate)
        }
        return createNoteFromRecording(recordingId, onJobUpdate)
    }

    /**
     * Pipeline for creating a note from a URL/link (YouTube, Podcast, Web Article).
     * Path A: Video/Audio Link -> Extract Captions or Audio -> Transcribe if needed -> Verified Transcript -> Stage 2 Synthesis
     * Path B: Article Link -> Fetch & Extract Article Text -> Verified Transcript -> Stage 2 Synthesis
     * Follows the exact same §7 candidate transcript validation gate and §8 note generation gate.
     */
    suspend fun createNoteFromUrl(
        url: String,
        subject: String = "General",
        customTitle: String? = null,
        onJobUpdate: (ProcessingJob) -> Unit = {}
    ): Note = withContext(Dispatchers.IO) {
        val validation = linkIngestionService.validateUrl(url)
        if (!validation.isValid) {
            throw IllegalArgumentException(validation.error ?: "Invalid URL")
        }

        val sourceId = "src_" + UUID.randomUUID().toString().take(8)
        if (activeJobs.contains(sourceId)) {
            throw IllegalStateException("A processing job is already in progress for source: $sourceId")
        }
        activeJobs.add(sourceId)

        val updateJob = { stage: ProcessingStage, msg: String, err: String? ->
            onJobUpdate(ProcessingJob(sourceId, stage, msg, err))
        }

        try {
            updateJob(ProcessingStage.VALIDATING, "Analyzing link and verifying safety...", null)
            val detectedType = linkIngestionService.detectSourceType(url)

            val source = Recording(
                id = sourceId,
                userId = _currentUser.value.userId,
                subject = subject.ifBlank { "General" },
                title = customTitle?.ifBlank { null } ?: (if (detectedType == SourceType.URL_ARTICLE) "Web Article" else "Online Lecture"),
                audioPath = "",
                durationSeconds = 0L,
                fileSizeBytes = 0L,
                createdAt = System.currentTimeMillis(),
                status = RecordingStatus.FETCHING,
                sourceType = detectedType,
                sourceUrl = url
            )
            saveRecording(source)

            updateJob(ProcessingStage.VALIDATING, "Fetching and extracting content from link...", null)
            val content = linkIngestionService.ingestUrl(url) { msg ->
                updateJob(ProcessingStage.VALIDATING, msg, null)
            }

            // §7 Candidate Transcript Gate
            val transcriptVal = validateTranscriptText(content.transcriptText, false)
            if (!transcriptVal.isValid) {
                val failedTranscript = Transcript(
                    id = "tr_" + UUID.randomUUID().toString().take(8),
                    recordingId = source.id,
                    sourceId = source.id,
                    sourceType = source.sourceType,
                    sourceUrl = source.sourceUrl,
                    text = content.transcriptText,
                    durationSeconds = content.durationSeconds,
                    createdAt = System.currentTimeMillis(),
                    status = TranscriptStatus.FAILED,
                    errorMessage = transcriptVal.error
                )
                dao.insertTranscript(TranscriptEntity.fromDomainModel(failedTranscript))

                val failedSource = source.copy(
                    status = RecordingStatus.FAILED,
                    errorMessage = transcriptVal.error,
                    transcriptId = failedTranscript.id
                )
                saveRecording(failedSource)
                throw IllegalStateException(transcriptVal.error)
            }

            // Save COMPLETED transcript
            val transcript = Transcript(
                id = "tr_" + UUID.randomUUID().toString().take(8),
                recordingId = source.id,
                sourceId = source.id,
                sourceType = source.sourceType,
                sourceUrl = source.sourceUrl,
                text = content.transcriptText,
                durationSeconds = content.durationSeconds,
                createdAt = System.currentTimeMillis(),
                status = TranscriptStatus.COMPLETED
            )
            dao.insertTranscript(TranscriptEntity.fromDomainModel(transcript))

            val updatedSource = source.copy(
                title = if (customTitle.isNullOrBlank() && !content.detectedTitle.isNullOrBlank()) content.detectedTitle else source.title,
                durationSeconds = content.durationSeconds,
                transcriptId = transcript.id
            )
            saveRecording(updatedSource)

            // §8 Note-Generation Gate Check
            val noteGate = canGenerateNote(updatedSource, transcript)
            if (!noteGate.isValid) {
                throw IllegalStateException(noteGate.error ?: "Note generation gate check failed.")
            }

            // Stage 2: Synthesis
            val synthesizingSource = updatedSource.copy(status = RecordingStatus.SYNTHESIZING)
            saveRecording(synthesizingSource)
            updateJob(ProcessingStage.SYNTHESIZING, "Synthesizing structured study notes, definitions & key concepts...", null)

            val structuredNotes = synthesisService.synthesizeNotes(
                recording = synthesizingSource,
                transcript = transcript,
                onProgress = { msg -> updateJob(ProcessingStage.SYNTHESIZING, msg, null) }
            )

            // Format date & duration
            val currentDate = SimpleDateFormat("MMM dd, yyyy", Locale.US).format(Date(synthesizingSource.createdAt))
            val mins = synthesizingSource.durationSeconds / 60
            val formattedDuration = if (synthesizingSource.sourceType == SourceType.URL_ARTICLE) {
                "${if (mins == 0L) 1L else mins} min read"
            } else {
                if (synthesizingSource.durationSeconds > 0) {
                    if (mins == 0L) "${synthesizingSource.durationSeconds}s" else "$mins mins"
                } else "45 mins"
            }

            val noteId = "note_" + UUID.randomUUID().toString().take(8)
            val note = Note(
                id = noteId,
                recordingId = synthesizingSource.id,
                transcriptId = transcript.id,
                sourceId = synthesizingSource.id,
                sourceType = synthesizingSource.sourceType,
                sourceUrl = synthesizingSource.sourceUrl,
                userId = synthesizingSource.userId,
                subject = synthesizingSource.subject,
                title = if (structuredNotes.title.isNotBlank()) structuredNotes.title else synthesizingSource.title,
                date = currentDate,
                durationFormatted = formattedDuration,
                durationSeconds = synthesizingSource.durationSeconds,
                transcriptText = transcript.text,
                structuredNotes = structuredNotes,
                aiOriginalNotes = structuredNotes,
                userEditedNotes = null,
                source = "ai_generated",
                version = 1,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis(),
                isDemo = false
            )
            saveNote(note)

            val completedSource = synthesizingSource.copy(
                status = RecordingStatus.COMPLETED,
                noteId = note.id
            )
            saveRecording(completedSource)

            updateJob(ProcessingStage.COMPLETED, "Notes ready!", null)
            return@withContext note
        } catch (e: Exception) {
            val errorMsg = e.localizedMessage ?: "Note creation from link failed."
            val src = dao.getRecordingById(sourceId)?.toDomainModel()
            if (src != null) {
                saveRecording(src.copy(status = RecordingStatus.FAILED, errorMessage = errorMsg))
            }
            updateJob(ProcessingStage.FAILED, "Failed to generate note from link.", errorMsg)
            throw e
        } finally {
            activeJobs.remove(sourceId)
        }
    }

    /**
     * §12 Regenerates structured notes strictly from the original verified transcript.
     * Never sources from an edited note.
     */
    suspend fun regenerateNote(noteId: String): Note = withContext(Dispatchers.IO) {
        val note = getNoteById(noteId) ?: throw IllegalStateException("Note $noteId not found.")

        if (activeJobs.contains(note.recordingId)) {
            throw IllegalStateException("A processing job is already running for this note's recording.")
        }
        activeJobs.add(note.recordingId)

        try {
            val recording = getRecordingById(note.recordingId)
                ?: throw IllegalStateException("Source recording ${note.recordingId} not found.")
            val transcriptEntity = dao.getTranscriptById(note.transcriptId)
                ?: throw IllegalStateException("Source transcript ${note.transcriptId} not found.")
            val transcript = transcriptEntity.toDomainModel()

            val gateCheck = canGenerateNote(recording, transcript)
            if (!gateCheck.isValid) {
                throw IllegalStateException(gateCheck.error ?: "Source transcript failed validation.")
            }

            val freshStructuredNotes = synthesisService.synthesizeNotes(recording, transcript)

            val updatedNote = note.copy(
                title = freshStructuredNotes.title.ifBlank { note.title },
                structuredNotes = freshStructuredNotes,
                aiOriginalNotes = freshStructuredNotes,
                userEditedNotes = null,
                source = "ai_generated",
                version = note.version + 1,
                updatedAt = System.currentTimeMillis()
            )

            saveNote(updatedNote)
            return@withContext updatedNote
        } finally {
            activeJobs.remove(note.recordingId)
        }
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
