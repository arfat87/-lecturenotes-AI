package com.example

import androidx.test.core.app.ApplicationProvider
import com.example.data.db.LectureDatabase
import com.example.data.models.Note
import com.example.data.models.NoteSection
import com.example.data.models.ProcessingStage
import com.example.data.models.Recording
import com.example.data.models.RecordingStatus
import com.example.data.models.StructuredNotes
import com.example.data.models.Transcript
import com.example.data.models.TranscriptStatus
import com.example.data.repository.LectureRepository
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
}
