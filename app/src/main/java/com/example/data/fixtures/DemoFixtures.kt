package com.example.data.fixtures

import com.example.data.models.Definition
import com.example.data.models.Note
import com.example.data.models.NoteSection
import com.example.data.models.Recording
import com.example.data.models.RecordingStatus
import com.example.data.models.StructuredNotes
import com.example.data.models.Transcript
import com.example.data.models.TranscriptStatus

object DemoFixtures {

    val DEMO_RECORDING_1 = Recording(
        id = "demo_rec_stanford_cs229",
        userId = "usr_101",
        subject = "Computer Science 229",
        title = "Supervised Learning & Gradient Descent",
        audioPath = "",
        durationSeconds = 2880,
        fileSizeBytes = 24500000,
        createdAt = 1753747200000L,
        status = RecordingStatus.COMPLETED,
        transcriptId = "demo_tr_stanford_cs229",
        noteId = "demo_note_stanford_cs229"
    )

    val DEMO_TRANSCRIPT_1 = Transcript(
        id = "demo_tr_stanford_cs229",
        recordingId = "demo_rec_stanford_cs229",
        text = "Welcome to CS229 Machine Learning. Today we start supervised learning with linear regression. We want to predict target y from input feature x using hypothesis h_theta(x) = theta^T x. To measure error we define the cost function J(theta) = 1/2 sum (h_theta(x^(i)) - y^(i))^2. Gradient descent iteratively updates theta_j := theta_j - alpha * d/d theta_j J(theta). Pay close attention to the learning rate alpha: if too large it diverges, if too small it is slow. This will appear on Midterm 1!",
        language = "en",
        durationSeconds = 2880,
        createdAt = 1753747200000L,
        status = TranscriptStatus.COMPLETED
    )

    private val cs229Notes = StructuredNotes(
        title = "Supervised Learning: Linear Regression & Gradient Descent",
        summary = "Comprehensive lecture on formulation of linear regression, quadratic mean-squared error cost function J(θ), batch gradient descent update rule, and convergence properties.",
        sections = listOf(
            NoteSection(
                heading = "1. Supervised Learning Formulation & Hypothesis Function",
                points = listOf(
                    "Given a training set of m examples {(x^(i), y^(i))}, our objective is to learn a hypothesis function h_θ(x) : X -> Y.",
                    "For linear regression, hypothesis parameterized by vector θ is h_θ(x) = ∑ θ_j x_j = θ^T x (with intercept term x_0 = 1).",
                    "The model assumes linear relationship between input continuous features and real-valued response."
                ),
                definitions = listOf(
                    Definition(
                        term = "Hypothesis Function h_θ(x)",
                        definition = "The mathematical mapping function parameterized by weights θ that takes feature vector x and estimates target variable y.",
                        added_context = "Standard affine transformation in parameter space."
                    )
                )
            ),
            NoteSection(
                heading = "2. Cost Function (Ordinary Least Squares)",
                points = listOf(
                    "Loss is measured using the squared error cost function: J(θ) = 1/2 ∑_{i=1}^m (h_θ(x^(i)) - y^(i))^2.",
                    "The leading coefficient 1/2 is chosen to simplify differentiation when taking gradients.",
                    "J(θ) is a convex quadratic bowl with a global minimum."
                ),
                definitions = listOf(
                    Definition(
                        term = "Mean Squared Cost J(θ)",
                        definition = "Objective function calculating sum of squared residuals between predictions and ground-truth values.",
                        added_context = "Strictly convex in linear models, ensuring no local minima traps."
                    )
                )
            ),
            NoteSection(
                heading = "3. Batch Gradient Descent Algorithm",
                points = listOf(
                    "Weight update rule: θ_j := θ_j - α * ∂J(θ)/∂θ_j = θ_j + α ∑_{i=1}^m (y^(i) - h_θ(x^(i))) * x_j^(i).",
                    "Simultaneous update: all parameters θ_0 ... θ_n must be updated simultaneously at each iteration step.",
                    "Learning rate α controls step magnitude. Too small yields slow convergence; too large causes divergence."
                ),
                definitions = listOf(
                    Definition(
                        term = "Learning Rate (α)",
                        definition = "A positive tuning hyperparameter dictating step size towards the negative gradient.",
                        added_context = null
                    )
                ),
                exam_flag = "EXAM QUESTION: Derive the partial derivative ∂J(θ)/∂θ_j from first principles on the midterm exam!"
            )
        )
    )

    val DEMO_NOTE_1 = Note(
        id = "demo_note_stanford_cs229",
        recordingId = "demo_rec_stanford_cs229",
        transcriptId = "demo_tr_stanford_cs229",
        userId = "usr_101",
        subject = "Computer Science 229",
        title = "Supervised Learning: Linear Regression & Gradient Descent",
        date = "Jul 28, 2026",
        durationFormatted = "48 mins",
        durationSeconds = 2880,
        transcriptText = DEMO_TRANSCRIPT_1.text,
        structuredNotes = cs229Notes,
        aiOriginalNotes = cs229Notes,
        userEditedNotes = null,
        createdAt = 1753747200000L,
        updatedAt = 1753747200000L,
        isDemo = true
    )

    val ALL_DEMO_NOTES = listOf(DEMO_NOTE_1)
    val ALL_DEMO_RECORDINGS = listOf(DEMO_RECORDING_1)
    val ALL_DEMO_TRANSCRIPTS = listOf(DEMO_TRANSCRIPT_1)
}
