package com.example

import androidx.test.core.app.ApplicationProvider
import com.example.data.db.LectureDatabase
import com.example.data.models.Note
import com.example.data.models.NoteSection
import com.example.data.models.ProcessingStage
import com.example.data.models.Recording
import com.example.data.models.RecordingStatus
import com.example.data.models.SourceType
import com.example.data.models.StructuredNotes
import com.example.data.models.Transcript
import com.example.data.models.TranscriptStatus
import com.example.data.repository.LectureRepository
import com.example.data.service.LinkIngestionService
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class PipelineIntegrityTest {

    private lateinit var repository: LectureRepository

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        repository = LectureRepository(context)
    }

    @Test
    fun `demo fixtures are isolated and marked isDemo true`() = runBlocking {
        repository.seedDemoFixturesIfEmpty()
        val notes = repository.allNotes.first()
        assertTrue("Notes should not be empty after seeding demo", notes.isNotEmpty())
        val demoNote = notes.firstOrNull { it.isDemo }
        assertNotNull("Demo note must exist", demoNote)
        assertTrue("Demo note must have isDemo flag set to true", demoNote!!.isDemo)
    }

    @Test
    fun `recording audio is preserved and failure does not generate fake notes`() = runBlocking {
        val tempAudio = File.createTempFile("lecture_test_audio", ".m4a")
        tempAudio.writeBytes(byteArrayOf(1, 2, 3, 4, 5))

        val recording = Recording(
            id = "rec_test_integrity_01",
            userId = "usr_test",
            subject = "Physics 101",
            title = "Quantum Mechanics",
            audioPath = tempAudio.absolutePath,
            durationSeconds = 120,
            fileSizeBytes = tempAudio.length(),
            createdAt = System.currentTimeMillis(),
            status = RecordingStatus.STOPPED
        )

        repository.saveRecording(recording)

        val savedRec = repository.getRecordingById("rec_test_integrity_01")
        assertNotNull(savedRec)
        assertEquals("Physics 101", savedRec!!.subject)
        assertEquals(tempAudio.absolutePath, savedRec.audioPath)

        // Clean up
        repository.deleteRecording("rec_test_integrity_01")
        val deleted = repository.getRecordingById("rec_test_integrity_01")
        assertEquals(null, deleted)
    }

    @Test
    fun `note saves and restores structured topics, definitions and exam flags`() = runBlocking {
        val notesStruct = StructuredNotes(
            title = "Test Lecture Title",
            summary = "Test summary",
            sections = listOf(
                NoteSection(
                    heading = "Section 1",
                    points = listOf("Key takeaway 1"),
                    definitions = emptyList(),
                    exam_flag = "MIDTERM ALERT: Formula X"
                )
            )
        )

        val note = Note(
            id = "note_test_provenance",
            recordingId = "rec_test_provenance",
            transcriptId = "tr_test_provenance",
            userId = "usr_101",
            subject = "Biology 101",
            title = "Cellular Respiration",
            date = "Sep 16, 2026",
            durationFormatted = "30 mins",
            durationSeconds = 1800,
            transcriptText = "Spoken text from audio",
            structuredNotes = notesStruct,
            aiOriginalNotes = notesStruct,
            userEditedNotes = null,
            isDemo = false
        )

        repository.saveNote(note)

        val retrieved = repository.getNoteById("note_test_provenance")
        assertNotNull(retrieved)
        assertEquals("rec_test_provenance", retrieved!!.recordingId)
        assertEquals("tr_test_provenance", retrieved.transcriptId)
        assertFalse("Real note must have isDemo false", retrieved.isDemo)
        assertEquals("MIDTERM ALERT: Formula X", retrieved.structuredNotes.sections[0].exam_flag)

        repository.deleteNote("note_test_provenance")
    }

    @Test
    fun `canTranscribe pre-flight checklist enforces valid audio and user ownership`() {
        val tempAudio = File.createTempFile("lecture_valid", ".mp4")
        tempAudio.writeBytes(ByteArray(1024) { 1 })

        val validRec = Recording(
            id = "rec_preflight_01",
            userId = "usr_101",
            subject = "Algorithms",
            title = "Dynamic Programming",
            audioPath = tempAudio.absolutePath,
            durationSeconds = 600,
            fileSizeBytes = tempAudio.length(),
            createdAt = System.currentTimeMillis(),
            status = RecordingStatus.STOPPED
        )

        // Valid case
        val validCheck = LectureRepository.canTranscribe(validRec, tempAudio, repository.currentUser.value)
        assertTrue(validCheck.isValid)

        // Null recording
        assertFalse(LectureRepository.canTranscribe(null, tempAudio, repository.currentUser.value).isValid)

        // Impostor user
        val impostorUser = repository.currentUser.value.copy(userId = "usr_impostor")
        val impostorCheck = LectureRepository.canTranscribe(validRec, tempAudio, impostorUser)
        assertFalse(impostorCheck.isValid)
        assertTrue(impostorCheck.error!!.contains("does not belong"))

        // Missing or 0-byte file
        val emptyAudio = File.createTempFile("lecture_empty", ".mp4")
        val emptyCheck = LectureRepository.canTranscribe(validRec, emptyAudio, repository.currentUser.value)
        assertFalse(emptyCheck.isValid)
        assertTrue(emptyCheck.error!!.contains("0 bytes"))

        // Invalid duration
        val zeroDurationRec = validRec.copy(durationSeconds = 0)
        assertFalse(LectureRepository.canTranscribe(zeroDurationRec, tempAudio, repository.currentUser.value).isValid)

        // Already transcribing
        val transcribingRec = validRec.copy(status = RecordingStatus.TRANSCRIBING)
        assertFalse(LectureRepository.canTranscribe(transcribingRec, tempAudio, repository.currentUser.value).isValid)

        tempAudio.delete()
        emptyAudio.delete()
    }

    @Test
    fun `validateTranscriptText rejects empty and placeholder transcripts in production`() {
        // Genuine text
        val genuineCheck = LectureRepository.validateTranscriptText("Today we introduce memoization and tabulation.", false)
        assertTrue(genuineCheck.isValid)

        // Blank or null
        assertFalse(LectureRepository.validateTranscriptText(null, false).isValid)
        assertFalse(LectureRepository.validateTranscriptText("", false).isValid)
        assertFalse(LectureRepository.validateTranscriptText("   \t  ", false).isValid)

        // Short
        val shortCheck = LectureRepository.validateTranscriptText("Hi", false)
        assertFalse(shortCheck.isValid)
        assertTrue(shortCheck.error!!.contains("too short"))

        // Known placeholders rejected when isDemo = false
        val placeholders = listOf(
            "test",
            "sample transcript",
            "lorem ipsum",
            "demo lecture",
            "sample text",
            "placeholder",
            "test lecture"
        )
        for (ph in placeholders) {
            val res = LectureRepository.validateTranscriptText(ph, isDemo = false)
            assertFalse("Placeholder '$ph' must be rejected", res.isValid)
            assertTrue("Error must mention placeholder", res.error!!.contains("placeholder"))
        }

        // Placeholders permitted when isDemo = true
        val demoCheck = LectureRepository.validateTranscriptText("demo lecture on linear regression algorithms.", isDemo = true)
        assertTrue(demoCheck.isValid)
    }

    @Test
    fun `canGenerateNote gate rejects incomplete or mismatched transcripts`() {
        val recording = Recording(
            id = "rec_gate_01",
            userId = "usr_101",
            subject = "Chemistry",
            title = "Thermodynamics",
            audioPath = "/dummy/path.mp4",
            durationSeconds = 1200,
            fileSizeBytes = 5000000,
            createdAt = System.currentTimeMillis()
        )

        val completedTr = Transcript(
            id = "tr_gate_01",
            recordingId = "rec_gate_01",
            text = "Enthalpy and entropy describe spontaneity of chemical reactions under Gibbs free energy.",
            language = "en",
            durationSeconds = 1200,
            createdAt = System.currentTimeMillis(),
            status = TranscriptStatus.COMPLETED
        )

        // Valid case
        assertTrue(LectureRepository.canGenerateNote(recording, completedTr, emptySet()).isValid)

        // Non-COMPLETED status
        val failedTr = completedTr.copy(status = TranscriptStatus.FAILED)
        assertFalse(LectureRepository.canGenerateNote(recording, failedTr, emptySet()).isValid)

        // Mismatched recordingId
        val mismatchedTr = completedTr.copy(recordingId = "rec_other_999")
        assertFalse(LectureRepository.canGenerateNote(recording, mismatchedTr, emptySet()).isValid)

        // Duplicate active job on same recording
        val activeJobs = setOf("rec_gate_01")
        val dupCheck = LectureRepository.canGenerateNote(recording, completedTr, activeJobs)
        assertFalse(dupCheck.isValid)
        assertTrue(dupCheck.error!!.contains("already active"))
    }

    @Test
    fun `note versioning preserves aiOriginalNotes across user edits and reset`() = runBlocking {
        val originalNotes = StructuredNotes(
            title = "Original Title",
            summary = "Original summary",
            sections = listOf(NoteSection(heading = "Topic 1", points = listOf("Point 1")))
        )

        val note = Note(
            id = "note_version_test",
            recordingId = "rec_version_test",
            transcriptId = "tr_version_test",
            userId = "usr_101",
            subject = "Physics",
            title = "Special Relativity",
            date = "Sep 16, 2026",
            durationFormatted = "40 mins",
            durationSeconds = 2400,
            transcriptText = "Einstein postulate speed of light is constant in all inertial reference frames.",
            structuredNotes = originalNotes,
            aiOriginalNotes = originalNotes,
            userEditedNotes = null,
            source = "ai_generated",
            version = 1,
            isDemo = false
        )

        repository.saveNote(note)

        // Verify initial state
        var loaded = repository.getNoteById("note_version_test")
        assertNotNull(loaded)
        assertEquals("ai_generated", loaded!!.source)
        assertEquals(1, loaded.version)

        // User edits note
        val editedNotes = StructuredNotes(
            title = "My Custom Title",
            summary = "User modified summary",
            sections = listOf(NoteSection(heading = "Topic 1", points = listOf("Edited point")))
        )
        val edited = loaded.copy(
            title = "My Custom Title",
            structuredNotes = editedNotes,
            userEditedNotes = editedNotes,
            source = "user_edited"
        )
        repository.updateNote(edited)

        loaded = repository.getNoteById("note_version_test")
        assertNotNull(loaded)
        assertEquals("user_edited", loaded!!.source)
        assertEquals("My Custom Title", loaded.structuredNotes.title)
        // aiOriginalNotes must remain intact!
        assertEquals("Original Title", loaded.aiOriginalNotes.title)

        // Reset to AI Original
        val reset = loaded.copy(
            title = loaded.aiOriginalNotes.title,
            structuredNotes = loaded.aiOriginalNotes,
            userEditedNotes = null,
            source = "ai_generated"
        )
        repository.updateNote(reset)

        loaded = repository.getNoteById("note_version_test")
        assertNotNull(loaded)
        assertEquals("ai_generated", loaded!!.source)
        assertEquals(null, loaded.userEditedNotes)
        assertEquals("Original Title", loaded.structuredNotes.title)

        repository.deleteNote("note_version_test")
    }

    @Test
    fun `validateUrl SSRF protection rejects private, loopback, and cloud metadata IPs`() {
        val ingestionService = LinkIngestionService()

        // Localhost & loopback
        assertFalse(ingestionService.validateUrl("http://localhost:8080/admin").isValid)
        assertFalse(ingestionService.validateUrl("http://127.0.0.1/status").isValid)
        assertFalse(ingestionService.validateUrl("http://[::1]/secret").isValid)

        // RFC 1918 Private ranges
        assertFalse(ingestionService.validateUrl("http://192.168.1.1/router").isValid)
        assertFalse(ingestionService.validateUrl("http://10.0.0.1/db").isValid)
        assertFalse(ingestionService.validateUrl("http://172.16.0.5/internal").isValid)
        assertFalse(ingestionService.validateUrl("http://172.31.255.255/internal").isValid)

        // Cloud metadata & link-local
        assertFalse(ingestionService.validateUrl("http://169.254.169.254/latest/meta-data").isValid)

        // Local domains
        assertFalse(ingestionService.validateUrl("http://mycomputer.local/index.html").isValid)
        assertFalse(ingestionService.validateUrl("http://mycluster.internal/status").isValid)

        // Non http/https schemes
        assertFalse(ingestionService.validateUrl("ftp://example.com/file").isValid)
        assertFalse(ingestionService.validateUrl("file:///etc/passwd").isValid)

        // Public URLs must be valid
        assertTrue(ingestionService.validateUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ").isValid)
        assertTrue(ingestionService.validateUrl("https://en.wikipedia.org/wiki/Machine_learning").isValid)
    }

    @Test
    fun `detectSourceType classifies URLs into video, audio, or article accurately`() {
        val ingestionService = LinkIngestionService()

        // Video
        assertEquals(SourceType.URL_VIDEO, ingestionService.detectSourceType("https://www.youtube.com/watch?v=12345"))
        assertEquals(SourceType.URL_VIDEO, ingestionService.detectSourceType("https://youtu.be/12345"))
        assertEquals(SourceType.URL_VIDEO, ingestionService.detectSourceType("https://vimeo.com/987654"))

        // Audio
        assertEquals(SourceType.URL_AUDIO, ingestionService.detectSourceType("https://open.spotify.com/episode/abc"))
        assertEquals(SourceType.URL_AUDIO, ingestionService.detectSourceType("https://podcasts.apple.com/us/podcast/123"))
        assertEquals(SourceType.URL_AUDIO, ingestionService.detectSourceType("https://example.com/lecture.mp3"))

        // Web Article
        assertEquals(SourceType.URL_ARTICLE, ingestionService.detectSourceType("https://en.wikipedia.org/wiki/Deep_learning"))
        assertEquals(SourceType.URL_ARTICLE, ingestionService.detectSourceType("https://medium.com/@author/neural-networks"))
    }

    @Test
    fun `article extraction strips scripts, navs, headers, and extracts meaningful text`() {
        val ingestionService = LinkIngestionService()
        val rawHtml = """
            <!DOCTYPE html>
            <html>
            <head><title>Lecture on Computer Systems</title></head>
            <body>
                <header><nav><a href="/home">Home</a></nav></header>
                <article>
                    <h1>Introduction to Virtual Memory</h1>
                    <p>Virtual memory is a memory management technique that provides an idealized abstraction of the storage resources that are actually available on a given machine which creates the illusion to users of a very large main memory.</p>
                </article>
                <script>console.log("tracking code");</script>
                <footer>&copy; 2026 University</footer>
            </body>
            </html>
        """.trimIndent()

        val (title, text) = ingestionService.extractArticleText(rawHtml)
        assertEquals("Lecture on Computer Systems", title)
        assertTrue("Extracted text must contain article heading", text.contains("Introduction to Virtual Memory"))
        assertTrue("Extracted text must contain article body", text.contains("Virtual memory is a memory management technique"))
        assertFalse("Extracted text must not contain script content", text.contains("tracking code"))
        assertFalse("Extracted text must not contain navigation links", text.contains("Home"))
    }

    @Test
    fun `createNoteFromUrl rejects SSRF attack without creating fake notes`() = runBlocking {
        var failed = false
        try {
            repository.createNoteFromUrl(
                url = "http://127.0.0.1:8080/internal-api",
                subject = "Computer Science"
            )
        } catch (e: IllegalArgumentException) {
            failed = true
            assertTrue("Error message must mention private IP or localhost", e.message!!.contains("SSRF") || e.message!!.contains("private") || e.message!!.contains("Loopback") || e.message!!.contains("Localhost"))
        }

        assertTrue("Expected createNoteFromUrl to throw IllegalArgumentException on SSRF URL", failed)
    }
}
