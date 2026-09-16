package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.models.Note
import com.example.data.models.ProcessingJob
import com.example.data.models.ProcessingStage
import com.example.data.models.Recording
import com.example.data.models.RecordingStatus
import com.example.data.models.StructuredNotes
import com.example.data.models.UserAccount
import com.example.data.repository.LectureRepository
import com.example.recording.AudioRecordingService
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File
import java.util.UUID

class LectureViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = LectureRepository(application)

    val currentUser: StateFlow<UserAccount> = repository.currentUser
    val isLoggedIn: StateFlow<Boolean> = repository.isLoggedIn

    val allNotes: StateFlow<List<Note>> = repository.allNotes
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allRecordings: StateFlow<List<Recording>> = repository.allRecordings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    @OptIn(ExperimentalCoroutinesApi::class)
    val searchResults: StateFlow<List<Note>> = _searchQuery
        .flatMapLatest { query ->
            if (query.isBlank()) repository.allNotes
            else repository.searchNotes(query)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val recordingStatus: StateFlow<AudioRecordingService.Companion.RecordingStatus> =
        AudioRecordingService.recordingState

    private val _activeJob = MutableStateFlow<ProcessingJob?>(null)
    val activeJob: StateFlow<ProcessingJob?> = _activeJob.asStateFlow()

    private val _selectedNote = MutableStateFlow<Note?>(null)
    val selectedNote: StateFlow<Note?> = _selectedNote.asStateFlow()

    init {
        viewModelScope.launch {
            repository.seedDemoFixturesIfEmpty()
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun selectNote(note: Note) {
        _selectedNote.value = note
    }

    fun selectNoteById(id: String) {
        viewModelScope.launch {
            val note = repository.getNoteById(id)
            _selectedNote.value = note
        }
    }

    fun startRecording(subject: String) {
        AudioRecordingService.startService(getApplication(), subject)
    }

    fun pauseRecording() {
        AudioRecordingService.pauseService(getApplication())
    }

    fun resumeRecording() {
        AudioRecordingService.resumeService(getApplication())
    }

    fun stopRecordingAndProcess(
        customTitle: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit = {}
    ) {
        val status = recordingStatus.value
        val subject = status.subject.ifBlank { "General Course" }
        val filePath = status.filePath
        val durationSeconds = status.elapsedSeconds

        AudioRecordingService.stopService(getApplication())

        if (filePath.isNullOrBlank() || durationSeconds < 2L) {
            onError("Recording was too short or no audio file was captured.")
            return
        }

        val audioFile = File(filePath)
        val recordingId = "rec_" + UUID.randomUUID().toString().take(8)
        val recording = Recording(
            id = recordingId,
            userId = currentUser.value.userId,
            subject = subject,
            title = customTitle.ifBlank { "Lecture Recording - $subject" },
            audioPath = audioFile.absolutePath,
            durationSeconds = durationSeconds,
            fileSizeBytes = if (audioFile.exists()) audioFile.length() else 0L,
            createdAt = System.currentTimeMillis(),
            status = RecordingStatus.STOPPED
        )

        viewModelScope.launch {
            repository.saveRecording(recording)
            processRecordingPipeline(recordingId, onSuccess)
        }
    }

    fun retryProcessing(recordingId: String, onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            processRecordingPipeline(recordingId, onSuccess)
        }
    }

    private suspend fun processRecordingPipeline(
        recordingId: String,
        onSuccess: (String) -> Unit
    ) {
        _activeJob.value = ProcessingJob(
            recordingId = recordingId,
            stage = ProcessingStage.VALIDATING,
            progressMessage = "Validating saved audio recording..."
        )

        try {
            val note = repository.createNoteFromRecording(recordingId) { job ->
                _activeJob.value = job
            }
            _selectedNote.value = note
            _activeJob.value = null
            onSuccess(note.id)
        } catch (e: Exception) {
            e.printStackTrace()
            val errorMsg = e.localizedMessage ?: "Pipeline failed."
            _activeJob.value = ProcessingJob(
                recordingId = recordingId,
                stage = ProcessingStage.FAILED,
                progressMessage = "Processing failed.",
                error = errorMsg
            )
        }
    }

    fun dismissProcessingJob() {
        _activeJob.value = null
    }

    fun regenerateNote(noteId: String) {
        viewModelScope.launch {
            try {
                val updated = repository.regenerateNote(noteId)
                _selectedNote.value = updated
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateSelectedNote(updatedNotes: StructuredNotes) {
        val current = _selectedNote.value ?: return
        val isReset = updatedNotes == current.aiOriginalNotes
        val updated = current.copy(
            title = updatedNotes.title.ifBlank { current.title },
            structuredNotes = updatedNotes,
            userEditedNotes = if (isReset) null else updatedNotes,
            source = if (isReset) "ai_generated" else "user_edited",
            updatedAt = System.currentTimeMillis()
        )
        _selectedNote.value = updated
        viewModelScope.launch {
            repository.updateNote(updated)
        }
    }

    fun deleteNote(id: String) {
        viewModelScope.launch {
            repository.deleteNote(id)
            if (_selectedNote.value?.id == id) {
                _selectedNote.value = null
            }
        }
    }

    fun deleteRecording(id: String) {
        viewModelScope.launch {
            repository.deleteRecording(id)
        }
    }

    fun login(email: String, name: String) {
        repository.login(email, name)
    }

    fun logout() {
        repository.logout()
    }
}
