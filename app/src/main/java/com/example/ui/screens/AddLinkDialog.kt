package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Link
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.models.SourceType
import com.example.data.service.LinkIngestionService
import com.example.ui.theme.ExamFlagRed
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.SuccessGreen

@Composable
fun AddLinkDialog(
    onDismiss: () -> Unit,
    onSubmit: (url: String, subject: String, title: String) -> Unit
) {
    var url by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }

    val linkService = remember { LinkIngestionService() }
    val validation = remember(url) {
        if (url.isBlank()) null else linkService.validateUrl(url)
    }
    val detectedType = remember(url, validation) {
        if (validation != null && validation.isValid) {
            try { linkService.detectSourceType(url) } catch (e: Exception) { SourceType.URL_ARTICLE }
        } else {
            SourceType.URL_ARTICLE
        }
    }

    val isSubmitEnabled = validation != null && validation.isValid

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = IndigoPrimary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Link,
                            contentDescription = null,
                            tint = IndigoPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text("Create Note from Link", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    Text("YouTube, Podcasts, or Web Articles", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("URL / Link *") },
                    placeholder = { Text("https://www.youtube.com/... or https://example.com/article") },
                    singleLine = true,
                    isError = validation != null && !validation.isValid,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("add_link_url_input")
                )

                if (url.isNotBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    if (validation != null && validation.isValid) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Valid public URL", fontSize = 11.sp, color = SuccessGreen)
                            }

                            val (badgeText, badgeColor) = when (detectedType) {
                                SourceType.URL_VIDEO -> "YouTube / Video" to Color(0xFFE11D48)
                                SourceType.URL_AUDIO -> "Podcast / Audio" to Color(0xFF7C3AED)
                                else -> "Web Article" to Color(0xFF0284C7)
                            }
                            Surface(
                                color = badgeColor.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = badgeText,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = badgeColor,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    } else if (validation != null && !validation.isValid) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Error, contentDescription = null, tint = ExamFlagRed, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(validation.error ?: "Invalid URL", fontSize = 11.sp, color = ExamFlagRed)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Subject (Optional)") },
                    placeholder = { Text("e.g. Biology 101, Computer Science") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Custom Title (Optional)") },
                    placeholder = { Text("e.g. Intro to Machine Learning") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "Content is extracted verbatim first. Note generation only proceeds after valid lecture content is verified.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (isSubmitEnabled) {
                        onSubmit(url.trim(), subject.trim(), title.trim())
                    }
                },
                enabled = isSubmitEnabled,
                colors = ButtonDefaults.buttonColors(containerColor = IndigoPrimary),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.testTag("add_link_submit_button")
            ) {
                Text("Generate Notes", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
