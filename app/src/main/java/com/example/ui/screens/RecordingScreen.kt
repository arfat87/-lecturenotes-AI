package com.example.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.recording.AudioRecordingService
import com.example.ui.theme.ExamFlagRed
import com.example.ui.theme.IndigoContainer
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.IndigoSecondary
import kotlin.random.Random

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecordingScreen(
    recordingStatus: AudioRecordingService.Companion.RecordingStatus,
    onStartRecording: (subject: String) -> Unit,
    onPauseRecording: () -> Unit,
    onResumeRecording: () -> Unit,
    onStopRecording: (customTitle: String) -> Unit,
    onBack: () -> Unit
) {
    var subjectName by remember { mutableStateOf(recordingStatus.subject.ifBlank { "Computer Science 106B" }) }
    var lectureTitle by remember { mutableStateOf("Graph Algorithms & BFS") }

    val context = LocalContext.current
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val recordAudioGranted = permissions[Manifest.permission.RECORD_AUDIO] == true
        if (recordAudioGranted) {
            onStartRecording(subjectName)
        }
    }

    val checkAndStartRecording = {
        val permissionsToRequest = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        val allGranted = permissionsToRequest.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }

        if (allGranted) {
            onStartRecording(subjectName)
        } else {
            permissionLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lecture Recording", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Lecture Subject & Topic Inputs
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = subjectName,
                    onValueChange = { subjectName = it },
                    label = { Text("Course / Subject Name") },
                    placeholder = { Text("e.g. Organic Chemistry, CS 106B") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("recording_subject_input"),
                    singleLine = true,
                    enabled = !recordingStatus.isRecording,
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = lectureTitle,
                    onValueChange = { lectureTitle = it },
                    label = { Text("Lecture Title / Topic (Optional)") },
                    placeholder = { Text("e.g. Nucleophilic Substitution") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("recording_title_input"),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // Central Timer & Audio Visualizer
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // Audio Waveform Animation
                Row(
                    modifier = Modifier
                        .height(80.dp)
                        .fillMaxWidth(0.8f),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    repeat(16) { index ->
                        val infiniteTransition = rememberInfiniteTransition(label = "bar_$index")
                        val heightMultiplier by infiniteTransition.animateFloat(
                            initialValue = 0.2f,
                            targetValue = if (recordingStatus.isRecording && !recordingStatus.isPaused) {
                                (0.3f + (index % 5) * 0.15f + Random.nextFloat() * 0.3f).coerceAtMost(1.0f)
                            } else 0.15f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(durationMillis = 300 + (index * 40), easing = FastOutSlowInEasing),
                                repeatMode = RepeatMode.Reverse
                            ),
                            label = "anim_$index"
                        )

                        Box(
                            modifier = Modifier
                                .width(6.dp)
                                .fillMaxHeight(heightMultiplier)
                                .clip(RoundedCornerShape(3.dp))
                                .background(if (recordingStatus.isRecording) ExamFlagRed else IndigoPrimary)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Timer Display
                Text(
                    text = AudioRecordingService.formatDuration(recordingStatus.elapsedSeconds),
                    style = MaterialTheme.typography.displayMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 48.sp
                    ),
                    color = MaterialTheme.colorScheme.onBackground
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Status Badge
                Surface(
                    color = when {
                        recordingStatus.isPaused -> MaterialTheme.colorScheme.surfaceVariant
                        recordingStatus.isRecording -> ExamFlagRed.copy(alpha = 0.15f)
                        else -> IndigoContainer
                    },
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        recordingStatus.isPaused -> Color.Gray
                                        recordingStatus.isRecording -> ExamFlagRed
                                        else -> IndigoPrimary
                                    }
                                )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = when {
                                recordingStatus.isPaused -> "RECORDING PAUSED"
                                recordingStatus.isRecording -> "RECORDING LIVE"
                                else -> "READY TO RECORD"
                            },
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                            color = when {
                                recordingStatus.isPaused -> MaterialTheme.colorScheme.onSurfaceVariant
                                recordingStatus.isRecording -> ExamFlagRed
                                else -> IndigoPrimary
                            }
                        )
                    }
                }
            }

            // Controls Bar & Info Notice
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Background Recording Notice
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 24.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = IndigoSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Background Audio Active: Recording will continue smoothly if you lock screen or switch apps.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Main Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (!recordingStatus.isRecording) {
                        // Start Record Button
                        Button(
                            onClick = { checkAndStartRecording() },
                            modifier = Modifier
                                .size(84.dp)
                                .testTag("start_recording_button"),
                            shape = CircleShape,
                            colors = ButtonDefaults.buttonColors(containerColor = ExamFlagRed)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Mic,
                                contentDescription = "Start Recording",
                                modifier = Modifier.size(36.dp),
                                tint = Color.White
                            )
                        }
                    } else {
                        // Pause / Resume Button
                        Button(
                            onClick = {
                                if (recordingStatus.isPaused) onResumeRecording()
                                else onPauseRecording()
                            },
                            modifier = Modifier
                                .size(64.dp)
                                .testTag("pause_resume_button"),
                            shape = CircleShape,
                            colors = ButtonDefaults.buttonColors(containerColor = IndigoContainer)
                        ) {
                            Icon(
                                imageVector = if (recordingStatus.isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                                contentDescription = "Pause or Resume",
                                tint = IndigoPrimary,
                                modifier = Modifier.size(28.dp)
                            )
                        }

                        // Stop & Process Button
                        Button(
                            onClick = { onStopRecording(lectureTitle) },
                            modifier = Modifier
                                .height(64.dp)
                                .padding(horizontal = 16.dp)
                                .testTag("stop_recording_button"),
                            shape = RoundedCornerShape(32.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ExamFlagRed)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Stop,
                                contentDescription = "Stop",
                                tint = Color.White
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Finish & Process Notes",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
