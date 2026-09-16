package com.example.data.fixtures

import com.example.data.models.Definition
import com.example.data.models.ExamAlert
import com.example.data.models.ExampleGlobal
import com.example.data.models.Formula
import com.example.data.models.Note
import com.example.data.models.NoteSection
import com.example.data.models.QuestionsMentioned
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
        noteId = "demo_note_stanford_cs229",
        isDemo = true
    )

    val DEMO_TRANSCRIPT_1 = Transcript(
        id = "demo_tr_stanford_cs229",
        recordingId = "demo_rec_stanford_cs229",
        text = "Welcome to CS229 Machine Learning. Today we start supervised learning with linear regression. We want to predict target y from input feature x using hypothesis h_theta(x) = theta^T x. To measure error we define the cost function J(theta) = 1/2 sum (h_theta(x^(i)) - y^(i))^2. Gradient descent iteratively updates theta_j := theta_j - alpha * d/d theta_j J(theta). Pay close attention to the learning rate alpha: if too large it diverges, if too small it is slow. This will appear on Midterm 1!",
        language = "en",
        durationSeconds = 2880,
        createdAt = 1753747200000L,
        status = TranscriptStatus.COMPLETED,
        isEdited = false,
        originalTextRef = null,
        isDemo = true
    )

    private val cs229Notes = StructuredNotes(
        title = "Supervised Learning: Linear Regression & Gradient Descent",
        summary = "Comprehensive lecture on formulation of linear regression, quadratic mean-squared error cost function J(θ), batch gradient descent update rule, and convergence properties.",
        keyTakeaways = listOf(
            "Supervised learning maps input features x to target variables y via parameterized hypothesis h_θ(x).",
            "Linear regression hypothesis uses an affine linear combination: h_θ(x) = θ^T x.",
            "Ordinary least squares defines error through the quadratic convex cost function J(θ).",
            "Batch gradient descent iteratively shifts parameters in the direction of steepest descent scaled by learning rate α."
        ),
        sections = listOf(
            NoteSection(
                title = "1. Supervised Learning Formulation & Hypothesis Function",
                heading = "1. Supervised Learning Formulation & Hypothesis Function",
                coreConcept = "Mapping feature vectors to real-valued targets via hypothesis h_θ(x).",
                explanation = "Given a training set of m examples {(x^(i), y^(i))}, our objective is to learn a function h: X -> Y such that h(x) accurately predicts y.",
                logicOrProcess = "1. Define feature vector x with intercept term x_0 = 1. 2. Form parameter vector θ. 3. Compute inner product θ^T x.",
                examples = listOf("Predicting housing prices based on living square footage and number of bedrooms."),
                importantPoints = listOf(
                    "Given a training set of m examples {(x^(i), y^(i))}, our objective is to learn a hypothesis function h_θ(x) : X -> Y.",
                    "For linear regression, hypothesis parameterized by vector θ is h_θ(x) = ∑ θ_j x_j = θ^T x (with intercept term x_0 = 1).",
                    "The model assumes linear relationship between input continuous features and real-valued response."
                ),
                points = listOf(
                    "Given a training set of m examples {(x^(i), y^(i))}, our objective is to learn a hypothesis function h_θ(x) : X -> Y.",
                    "For linear regression, hypothesis parameterized by vector θ is h_θ(x) = ∑ θ_j x_j = θ^T x (with intercept term x_0 = 1).",
                    "The model assumes linear relationship between input continuous features and real-valued response."
                ),
                definitions = listOf(
                    Definition(
                        term = "Hypothesis Function h_θ(x)",
                        definition = "The mathematical mapping function parameterized by weights θ that takes feature vector x and estimates target variable y.",
                        context = "Standard linear affine transformation.",
                        added_context = "Standard affine transformation in parameter space."
                    )
                )
            ),
            NoteSection(
                title = "2. Cost Function (Ordinary Least Squares)",
                heading = "2. Cost Function (Ordinary Least Squares)",
                coreConcept = "Quantifying model error as sum of squared prediction deviations.",
                explanation = "Error is measured using the squared error cost function J(θ) = 1/2 ∑_{i=1}^m (h_θ(x^(i)) - y^(i))^2.",
                logicOrProcess = "Calculate residual deviation for each training example, square it to penalize large errors, sum over all m examples, and scale by 1/2.",
                examples = listOf("Evaluating squared residual distance from regression hyperplane on sample points."),
                importantPoints = listOf(
                    "Loss is measured using the squared error cost function: J(θ) = 1/2 ∑_{i=1}^m (h_θ(x^(i)) - y^(i))^2.",
                    "The leading coefficient 1/2 is chosen to simplify differentiation when taking gradients.",
                    "J(θ) is a convex quadratic bowl with a global minimum."
                ),
                points = listOf(
                    "Loss is measured using the squared error cost function: J(θ) = 1/2 ∑_{i=1}^m (h_θ(x^(i)) - y^(i))^2.",
                    "The leading coefficient 1/2 is chosen to simplify differentiation when taking gradients.",
                    "J(θ) is a convex quadratic bowl with a global minimum."
                ),
                definitions = listOf(
                    Definition(
                        term = "Mean Squared Cost J(θ)",
                        definition = "Objective function calculating sum of squared residuals between predictions and ground-truth values.",
                        context = "Convex quadratic loss surface.",
                        added_context = "Strictly convex in linear models, ensuring no local minima traps."
                    )
                )
            ),
            NoteSection(
                title = "3. Batch Gradient Descent Algorithm",
                heading = "3. Batch Gradient Descent Algorithm",
                coreConcept = "First-order optimization that steps downhill along the negative gradient of J(θ).",
                explanation = "Parameters θ_j are updated simultaneously using learning rate α and partial derivatives.",
                logicOrProcess = "Simultaneously update all θ_j := θ_j - α * ∂J(θ)/∂θ_j until convergence.",
                examples = listOf("Descending a 3D parabolic contour bowl to the global optimum."),
                importantPoints = listOf(
                    "Weight update rule: θ_j := θ_j - α * ∂J(θ)/∂θ_j = θ_j + α ∑_{i=1}^m (y^(i) - h_θ(x^(i))) * x_j^(i).",
                    "Simultaneous update: all parameters θ_0 ... θ_n must be updated simultaneously at each iteration step.",
                    "Learning rate α controls step magnitude. Too small yields slow convergence; too large causes divergence."
                ),
                points = listOf(
                    "Weight update rule: θ_j := θ_j - α * ∂J(θ)/∂θ_j = θ_j + α ∑_{i=1}^m (y^(i) - h_θ(x^(i))) * x_j^(i).",
                    "Simultaneous update: all parameters θ_0 ... θ_n must be updated simultaneously at each iteration step.",
                    "Learning rate α controls step magnitude. Too small yields slow convergence; too large causes divergence."
                ),
                definitions = listOf(
                    Definition(
                        term = "Learning Rate (α)",
                        definition = "A positive tuning hyperparameter dictating step size towards the negative gradient.",
                        context = "Gradient descent step size.",
                        added_context = null
                    )
                ),
                exam_flag = "EXAM QUESTION: Derive the partial derivative ∂J(θ)/∂θ_j from first principles on the midterm exam!"
            )
        ),
        definitions = listOf(
            Definition(
                term = "Hypothesis Function h_θ(x)",
                definition = "The mathematical mapping function parameterized by weights θ that estimates target variable y.",
                context = "Linear regression predictor"
            ),
            Definition(
                term = "Learning Rate (α)",
                definition = "Tuning parameter determining the step size at each iteration while moving toward a minimum.",
                context = "Optimization hyperparameter"
            )
        ),
        examplesGlobal = listOf(
            ExampleGlobal(
                example = "Housing Price Prediction based on square footage",
                explanation = "Linear model maps continuous square footage feature to continuous dollar sale price.",
                conceptDemonstrated = "Univariate linear regression"
            )
        ),
        formulas = listOf(
            Formula(
                formula = "h_θ(x) = θ^T x = ∑_{j=0}^n θ_j x_j",
                meaning = "Linear regression hypothesis function",
                variables = listOf("θ = parameter weight vector", "x = input feature vector", "x_0 = 1 (intercept term)"),
                context = "Model prediction formula"
            ),
            Formula(
                formula = "J(θ) = 1/2 ∑_{i=1}^m (h_θ(x^(i)) - y^(i))^2",
                meaning = "Ordinary least squares cost function",
                variables = listOf("m = number of training examples", "h_θ(x^(i)) = model prediction", "y^(i) = actual target value"),
                context = "Error minimization objective"
            ),
            Formula(
                formula = "θ_j := θ_j - α ∂J(θ)/∂θ_j",
                meaning = "Batch gradient descent update rule",
                variables = listOf("α = learning rate", "∂J(θ)/∂θ_j = gradient component for weight j"),
                context = "Simultaneous parameter update"
            )
        ),
        importantFacts = listOf(
            "Batch gradient descent evaluates all m training examples at every single step.",
            "Ordinary least squares cost function J(θ) is strictly convex, guaranteeing no local minima traps.",
            "Setting learning rate α too high can cause the cost function J(θ) to diverge and overshoot."
        ),
        examAlerts = listOf(
            ExamAlert(
                topic = "Gradient Descent Derivation",
                reason = "Explicitly stated to appear on Midterm 1",
                evidence = "Pay close attention to the learning rate alpha... This will appear on Midterm 1!"
            )
        ),
        questionsMentioned = QuestionsMentioned(
            lecturerQuestions = listOf(
                "What happens to gradient descent when the learning rate alpha is chosen too large?",
                "Why does the quadratic cost function guarantee convergence to the global optimum?"
            ),
            studentQuestions = emptyList<String>()
        ),
        actionItems = listOf(
            "Derive the partial derivative of J(θ) before next lecture.",
            "Complete Problem Set 1 on gradient descent implementation."
        ),
        unclearPoints = emptyList<String>()
    )

    val DEMO_NOTE_1 = Note(
        id = "demo_note_stanford_cs229",
        recordingId = "demo_rec_stanford_cs229",
        transcriptId = "demo_tr_stanford_cs229",
        sourceId = "demo_rec_stanford_cs229",
        sourceType = com.example.data.models.SourceType.AUDIO_RECORDING,
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
        source = "ai_generated",
        version = 1,
        createdAt = 1753747200000L,
        updatedAt = 1753747200000L,
        isDemo = true
    )

    val ALL_DEMO_NOTES = listOf(DEMO_NOTE_1)
    val ALL_DEMO_RECORDINGS = listOf(DEMO_RECORDING_1)
    val ALL_DEMO_TRANSCRIPTS = listOf(DEMO_TRANSCRIPT_1)
}
