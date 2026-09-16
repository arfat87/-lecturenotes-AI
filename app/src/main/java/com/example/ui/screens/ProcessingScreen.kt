package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.models.ProcessingJob
import com.example.data.models.ProcessingStage
import com.example.ui.theme.ExamFlagRed
import com.example.ui.theme.IndigoContainer
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.SuccessGreen

@Composable
fun ProcessingScreen(
    job: ProcessingJob,
    onRetry: () -> Unit,
    onDismiss: () -> Unit
) {
    val activeStep = when (job.stage) {
        ProcessingStage.VALIDATING -> 1
        ProcessingStage.TRANSCRIBING -> 2
        ProcessingStage.SYNTHESIZING -> 3
        ProcessingStage.COMPLETED -> 4
        ProcessingStage.FAILED -> 0
    }

    val isFailed = job.stage == ProcessingStage.FAILED

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp)
            .testTag("processing_screen"),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Status Icon Badge
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(if (isFailed) Color(0xFFFEE2E2) else IndigoContainer),
                contentAlignment = Alignment.Center
            ) {
                if (isFailed) {
                    Icon(
                        imageVector = Icons.Default.ErrorOutline,
                        contentDescription = null,
                        tint = ExamFlagRed,
                        modifier = Modifier.size(40.dp)
                    )
                } else {
                    CircularProgressIndicator(
                        modifier = Modifier.size(80.dp),
                        color = IndigoPrimary,
                        strokeWidth = 4.dp
                    )
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = null,
                        tint = IndigoPrimary,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = if (isFailed) "Note Generation Failed" else "Processing Lecture Content",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = job.progressMessage.ifBlank { "Processing with Gemini 2.0 Flash..." },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            if (isFailed && !job.error.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Reason for failure:", fontWeight = FontWeight.Bold, color = ExamFlagRed, style = MaterialTheme.typography.labelMedium)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(job.error, color = Color(0xFF7F1D1D), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Progress Stepper Cards
            if (!isFailed) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(20.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        StepItem(
                            stepNumber = 1,
                            title = "Validating Source Data",
                            subtitle = "Checking source audio or link contents",
                            icon = Icons.Default.CloudUpload,
                            isCurrent = activeStep == 1,
                            isComplete = activeStep > 1
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        StepItem(
                            stepNumber = 2,
                            title = "Transcription & Ingestion",
                            subtitle = "Converting speech or extracting source content",
                            icon = Icons.Default.RecordVoiceOver,
                            isCurrent = activeStep == 2,
                            isComplete = activeStep > 2
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        StepItem(
                            stepNumber = 3,
                            title = "Structuring Academic Notes",
                            subtitle = "Synthesizing headings, definitions & exam flags",
                            icon = Icons.Default.Psychology,
                            isCurrent = activeStep == 3,
                            isComplete = activeStep > 3
                        )
                    }
                }
            } else {
                // Failure controls
                Button(
                    onClick = onRetry,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoPrimary)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Retry Note Generation", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Keep Audio Recording for Later")
                }
            }
        }
    }
}

@Composable
fun StepItem(
    stepNumber: Int,
    title: String,
    subtitle: String,
    icon: ImageVector,
    isCurrent: Boolean,
    isComplete: Boolean
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(
                    when {
                        isComplete -> SuccessGreen
                        isCurrent -> IndigoPrimary
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            if (isComplete) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            } else {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (isCurrent) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = if (isCurrent || isComplete) FontWeight.Bold else FontWeight.Normal
                ),
                color = if (isCurrent || isComplete) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (isCurrent) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                color = IndigoPrimary,
                strokeWidth = 2.dp
            )
        }
    }
}
