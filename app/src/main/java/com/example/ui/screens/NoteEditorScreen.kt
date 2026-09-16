package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
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
import com.example.data.models.Definition
import com.example.data.models.Note
import com.example.data.models.NoteSection
import com.example.data.models.StructuredNotes
import com.example.ui.theme.ExamFlagRed
import com.example.ui.theme.IndigoPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteEditorScreen(
    note: Note,
    onSaveNotes: (StructuredNotes) -> Unit,
    onBack: () -> Unit
) {
    var title by remember { mutableStateOf(note.structuredNotes.title) }
    var summary by remember { mutableStateOf(note.structuredNotes.summary) }

    val sections = remember {
        mutableStateListOf<NoteSection>().apply {
            addAll(note.structuredNotes.sections)
        }
    }

    val resetToAI: () -> Unit = {
        title = note.aiOriginalNotes.title
        summary = note.aiOriginalNotes.summary
        sections.clear()
        sections.addAll(note.aiOriginalNotes.sections)
        Unit
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Study Notes", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = resetToAI) {
                        Icon(Icons.Default.Restore, contentDescription = "Reset to AI Original", tint = Color.Gray)
                    }
                    IconButton(
                        onClick = {
                            val updated = StructuredNotes(
                                title = title,
                                summary = summary,
                                sections = sections.toList()
                            )
                            onSaveNotes(updated)
                        },
                        modifier = Modifier.testTag("save_notes_button")
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Save Notes", tint = IndigoPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Title & Summary Editors
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "General Info",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = title,
                            onValueChange = { title = it },
                            label = { Text("Note Title") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("edit_note_title"),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = summary,
                            onValueChange = { summary = it },
                            label = { Text("Overview Summary") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("edit_note_summary"),
                            maxLines = 4,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }
            }

            // Section Editors
            itemsIndexed(sections) { sIndex, section ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Section ${sIndex + 1}",
                                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                color = IndigoPrimary
                            )

                            IconButton(onClick = { sections.removeAt(sIndex) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete Section", tint = ExamFlagRed)
                            }
                        }

                        OutlinedTextField(
                            value = section.heading,
                            onValueChange = { newHeading ->
                                sections[sIndex] = section.copy(heading = newHeading)
                            },
                            label = { Text("Section Heading") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "Key Bullet Points",
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        section.points.forEachIndexed { pIndex, point ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                OutlinedTextField(
                                    value = point,
                                    onValueChange = { newText ->
                                        val updatedPoints = section.points.toMutableList()
                                        updatedPoints[pIndex] = newText
                                        sections[sIndex] = section.copy(points = updatedPoints)
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp)
                                )
                                IconButton(onClick = {
                                    val updatedPoints = section.points.toMutableList()
                                    updatedPoints.removeAt(pIndex)
                                    sections[sIndex] = section.copy(points = updatedPoints)
                                }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Remove Point", tint = Color.Gray)
                                }
                            }
                        }

                        TextButton(onClick = {
                            val updatedPoints = section.points.toMutableList()
                            updatedPoints.add("New key takeaway point")
                            sections[sIndex] = section.copy(points = updatedPoints)
                        }) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Point")
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Definitions
                        Text(
                            text = "Key Definitions (${section.definitions.size})",
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        section.definitions.forEachIndexed { dIndex, def ->
                            Column(modifier = Modifier.padding(vertical = 4.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    OutlinedTextField(
                                        value = def.term,
                                        onValueChange = { newTerm ->
                                            val updatedDefs = section.definitions.toMutableList()
                                            updatedDefs[dIndex] = def.copy(term = newTerm)
                                            sections[sIndex] = section.copy(definitions = updatedDefs)
                                        },
                                        label = { Text("Term") },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    IconButton(onClick = {
                                        val updatedDefs = section.definitions.toMutableList()
                                        updatedDefs.removeAt(dIndex)
                                        sections[sIndex] = section.copy(definitions = updatedDefs)
                                    }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Remove Definition", tint = Color.Gray)
                                    }
                                }
                                OutlinedTextField(
                                    value = def.definition,
                                    onValueChange = { newDef ->
                                        val updatedDefs = section.definitions.toMutableList()
                                        updatedDefs[dIndex] = def.copy(definition = newDef)
                                        sections[sIndex] = section.copy(definitions = updatedDefs)
                                    },
                                    label = { Text("Definition") },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                        }

                        TextButton(onClick = {
                            val updatedDefs = section.definitions.toMutableList()
                            updatedDefs.add(Definition(term = "New Term", definition = "Definition text"))
                            sections[sIndex] = section.copy(definitions = updatedDefs)
                        }) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Definition")
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Exam Flag Field
                        OutlinedTextField(
                            value = section.exam_flag ?: "",
                            onValueChange = { newFlag ->
                                sections[sIndex] = section.copy(exam_flag = if (newFlag.isBlank()) null else newFlag)
                            },
                            label = { Text("Exam Flag / Midterm Highlight") },
                            placeholder = { Text("e.g. Will appear on Midterm 2!") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }
            }

            // Add New Section Button
            item {
                OutlinedButton(
                    onClick = {
                        sections.add(
                            NoteSection(
                                heading = "New Topic Heading",
                                points = listOf("First key concept"),
                                definitions = emptyList()
                            )
                        )
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add New Section")
                }
            }

            // Save Changes Bottom Button
            item {
                Button(
                    onClick = {
                        val updated = StructuredNotes(
                            title = title,
                            summary = summary,
                            sections = sections.toList()
                        )
                        onSaveNotes(updated)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoPrimary)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Save Note Changes", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }
    }
}
