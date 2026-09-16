package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.ui.screens.AuthScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.NoteEditorScreen
import com.example.ui.screens.NoteViewerScreen
import com.example.ui.screens.ProcessingScreen
import com.example.ui.screens.RecordingScreen
import com.example.ui.screens.SearchScreen
import com.example.ui.theme.LectureNotesTheme
import com.example.ui.viewmodel.LectureViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: LectureViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LectureNotesTheme {
                LectureNotesApp(viewModel = viewModel)
            }
        }
    }
}

object Routes {
    const val AUTH = "auth"
    const val HOME = "home"
    const val RECORDING = "recording"
    const val PROCESSING = "processing"
    const val NOTE_VIEWER = "note_viewer"
    const val NOTE_EDITOR = "note_editor"
    const val SEARCH = "search"
}

@Composable
fun LectureNotesApp(viewModel: LectureViewModel) {
    val navController = rememberNavController()

    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val user by viewModel.currentUser.collectAsState()
    val notes by viewModel.allNotes.collectAsState()
    val recordings by viewModel.allRecordings.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val recordingStatus by viewModel.recordingStatus.collectAsState()
    val activeJob by viewModel.activeJob.collectAsState()
    val selectedNote by viewModel.selectedNote.collectAsState()

    val startDestination = if (isLoggedIn) Routes.HOME else Routes.AUTH

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = Modifier.fillMaxSize()
    ) {
        // Auth Screen
        composable(Routes.AUTH) {
            AuthScreen(
                onLoginSuccess = { email, name ->
                    viewModel.login(email, name)
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.AUTH) { inclusive = true }
                    }
                }
            )
        }

        // Home Screen
        composable(Routes.HOME) {
            HomeScreen(
                user = user,
                notes = notes,
                recordings = recordings,
                recordingStatus = recordingStatus,
                onNavigateToRecord = {
                    navController.navigate(Routes.RECORDING)
                },
                onNavigateToSearch = {
                    navController.navigate(Routes.SEARCH)
                },
                onSelectNote = { note ->
                    viewModel.selectNote(note)
                    navController.navigate(Routes.NOTE_VIEWER)
                },
                onRetryRecording = { recId ->
                    viewModel.retryProcessing(recId) {
                        navController.navigate(Routes.NOTE_VIEWER) {
                            popUpTo(Routes.PROCESSING) { inclusive = true }
                        }
                    }
                    navController.navigate(Routes.PROCESSING)
                },
                onDeleteNote = { id ->
                    viewModel.deleteNote(id)
                },
                onDeleteRecording = { id ->
                    viewModel.deleteRecording(id)
                },
                onLogout = {
                    viewModel.logout()
                    navController.navigate(Routes.AUTH) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
            )
        }

        // Recording Screen
        composable(Routes.RECORDING) {
            RecordingScreen(
                recordingStatus = recordingStatus,
                onStartRecording = { subject ->
                    viewModel.startRecording(subject)
                },
                onPauseRecording = {
                    viewModel.pauseRecording()
                },
                onResumeRecording = {
                    viewModel.resumeRecording()
                },
                onStopRecording = { customTitle ->
                    viewModel.stopRecordingAndProcess(
                        customTitle = customTitle,
                        onSuccess = { _ ->
                            navController.navigate(Routes.NOTE_VIEWER) {
                                popUpTo(Routes.PROCESSING) { inclusive = true }
                            }
                        },
                        onError = {
                            navController.popBackStack()
                        }
                    )
                    navController.navigate(Routes.PROCESSING) {
                        popUpTo(Routes.RECORDING) { inclusive = true }
                    }
                },
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        // Processing Screen
        composable(Routes.PROCESSING) {
            val job = activeJob
            if (job != null) {
                ProcessingScreen(
                    job = job,
                    onRetry = {
                        viewModel.retryProcessing(job.recordingId) {
                            navController.navigate(Routes.NOTE_VIEWER) {
                                popUpTo(Routes.PROCESSING) { inclusive = true }
                            }
                        }
                    },
                    onDismiss = {
                        viewModel.dismissProcessingJob()
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.PROCESSING) { inclusive = true }
                        }
                    }
                )
            } else {
                navController.navigate(Routes.HOME) {
                    popUpTo(Routes.PROCESSING) { inclusive = true }
                }
            }
        }

        // Note Viewer Screen
        composable(Routes.NOTE_VIEWER) {
            val note = selectedNote
            if (note != null) {
                NoteViewerScreen(
                    note = note,
                    onBack = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = true }
                        }
                    },
                    onEdit = {
                        navController.navigate(Routes.NOTE_EDITOR)
                    },
                    onDelete = {
                        viewModel.deleteNote(note.id)
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = true }
                        }
                    },
                    onRegenerate = {
                        viewModel.regenerateNote(note.id)
                    }
                )
            } else {
                navController.popBackStack()
            }
        }

        // Note Editor Screen
        composable(Routes.NOTE_EDITOR) {
            val note = selectedNote
            if (note != null) {
                NoteEditorScreen(
                    note = note,
                    onSaveNotes = { updatedNotes ->
                        viewModel.updateSelectedNote(updatedNotes)
                        navController.popBackStack()
                    },
                    onBack = {
                        navController.popBackStack()
                    }
                )
            } else {
                navController.popBackStack()
            }
        }

        // Search Screen
        composable(Routes.SEARCH) {
            SearchScreen(
                searchQuery = searchQuery,
                onSearchQueryChange = { query ->
                    viewModel.setSearchQuery(query)
                },
                searchResults = searchResults,
                onSelectNote = { note ->
                    viewModel.selectNote(note)
                    navController.navigate(Routes.NOTE_VIEWER)
                },
                onBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
