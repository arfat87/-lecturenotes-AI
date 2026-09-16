<div align="center">
  <img width="1200" height="400" alt="LectureNotes AI Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" style="border-radius: 16px;" />

  # 🎓 LectureNotes AI
  **Verifiable Live Lecture Audio Capture & Structured Academic Notes Synthesizer**

  [![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Android](https://img.shields.io/badge/Android-Jetpack%20Compose-3DDC84?logo=android&logoColor=white)](https://developer.android.com/)
  [![Room](https://img.shields.io/badge/Room-Database%20v2-4285F4?logo=sqlite&logoColor=white)](https://developer.android.com/training/data-storage/room)
  [![Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
</div>

---

## 🌟 Core Philosophy & Architecture

> **"THE RECORDING MUST BE THE SOURCE OF TRUTH FOR NOTE CREATION."**

**LectureNotes AI** transforms real classroom audio into structured, high-yield study notes. Built upon a strict **two-stage verification pipeline**, the application guarantees that study notes are always backed by genuine spoken audio transcripts and never fabricated from placeholder text or simulated fallbacks.

Available as both a **Web Application (React + Vite + IndexedDB)** and a **Native Android Application (Kotlin + Jetpack Compose + Room Database)**.

```mermaid
flowchart LR
    A[🎙️ Microphone Audio] --> B[Audio Validation]
    B --> C[Stage 1: Speech-to-Text]
    C --> D[Verified Transcript]
    D --> E[Stage 2: Academic Synthesis]
    E --> F[Structured Notes]
    
    subgraph Storage
      A -.-> G[(IndexedDB / Room)]
      D -.-> G
      F -.-> G
    end
```

---

## ✨ Key Features

- 🎙️ **Real Microphone Audio Capture**:
  - Web Audio API waveform visualizer on browser.
  - Background foreground service recording on Android (`MediaRecorder`).
  - Audio files are stored permanently in local storage (IndexedDB `audio_blobs` store / Android app private storage).
- 🔄 **Strict 2-Stage Recording-to-Note Pipeline**:
  - **Stage 1 (Transcription)**: Faithful verbatim speech-to-text with Gemini 2.0 Flash (`text/plain` streaming).
  - **Stage 2 (Synthesis)**: Academic note extraction strictly from the verified transcript into structured JSON.
  - **Pre-flight Checklist (§5)**: Rigorous `canTranscribe` guard enforces audio existence, file size > 0, supported MIME types, valid duration, and user ownership.
  - **Transcript Validation Gate (§7)**: Rejects empty, whitespace-only, or known placeholder fixture strings before Stage 2 can ever be constructed.
  - **Note-Generation Gate (§8)**: Guaranteed `canGenerateNote` checkpoint requiring a persisted, non-empty `COMPLETED` transcript.
- 🚫 **Zero Fake Fallbacks**:
  - No synthetic sample generators in production.
  - If processing fails or audio is silent, the original audio is safely preserved in local storage and explicit retry actions are provided without requiring re-recording.
  - Retries reuse already `COMPLETED` transcripts if available, avoiding redundant transcription calls.
- 🔊 **Audio Provenance & Playback**:
  - Notes explicitly reference their `recordingId` and `transcriptId`.
  - Built-in audio player in Note Viewer enables instant listening of original lecture audio.
- 🧪 **Isolated Demo Fixtures**:
  - Pre-seeded Stanford CS229 sample lectures are explicitly tagged with `isDemo: true` and strictly isolated from user recordings.
- 🔒 **Granular Concurrency Locking (§11)**:
  - Per-`recordingId` lock prevents duplicate processing from double-clicks, hot reloads, or navigation while allowing independent recordings to proceed concurrently.
- ⚡ **Structured Study Insights**:
  - **Executive Summaries**: High-level synthesis of lecture goals.
  - **Topic Concept Breakdowns**: Logical grouping with clear bullet points.
  - **Key Definitions & Context**: Technical terms explained with context notes (💡).
  - **Exam Alerts**: Midterm and final exam callouts flagged automatically (⚡).
- ✍️ **Interactive Note Editor with Versioning (§12, §13)**:
  - Edit topics, points, definitions, and exam flags, with source attribution (`ai_generated` vs `user_edited`).
  - **Reset to AI Original**: Reverts locally to stored `aiOriginalNotes` without any API calls.
  - **Regenerate Notes**: Performs fresh AI synthesis strictly from the original `Transcript` (never from user edits), incrementing note version.
- 🔍 **Full-Text Search & Filtering**: Real-time querying across notes, definitions, transcripts, and exam alerts (`Ctrl + K` / `Cmd + K`).
- 📝 **Markdown Export**: One-click markdown copy formatted for Obsidian, Notion, or Bear.

---

## 🚀 Quick Start (Web Application)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm or pnpm / yarn

### 1. Configure Environment
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Install & Run
```bash
# Install dependencies
npm install

# Run unit & pipeline integrity tests (Vitest)
npm test

# Start development server
npm run dev

# Build for production
npm run build
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 📱 Quick Start (Android Application)

### Prerequisites
- [Android Studio](https://developer.android.com/studio) (Ladybug / Meerkat or newer)
- JDK 17 or JDK 21 (e.g. Android Studio embedded JBR)
- Android device or emulator (API level 24+)

### Steps:
1. Open the project root in **Android Studio**.
2. Ensure your `.env` file contains `GEMINI_API_KEY`.
3. Allow Gradle to synchronize dependencies.
4. Run unit and pipeline integrity tests:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   .\gradlew.bat testDebugUnitTest
   ```
5. Click **Run (▶)** to install and launch on your device/emulator.

---

## 📂 Project Structure

```text
lecturenotes/
├── src/                          # Web Application (React 18 + TypeScript + Vite)
│   ├── components/               # UI Components
│   │   ├── Navbar.tsx            # Header with search & student profile
│   │   ├── HomeScreen.tsx        # Dashboard, audio queues & course filter chips
│   │   ├── RecordingModal.tsx    # Live microphone capture & audio visualizer
│   │   ├── ProcessingModal.tsx   # Truthful pipeline status & retry
│   │   ├── NoteViewer.tsx        # Note view, audio playback & provenance badge
│   │   ├── NoteEditor.tsx        # Topic, definition, exam flag editor & Reset to AI
│   │   ├── SearchModal.tsx       # Instant search across notes & transcripts (Ctrl+K)
│   │   └── AuthModal.tsx         # User profile settings
│   ├── fixtures/
│   │   └── demoData.ts           # Isolated Stanford CS229 demo fixtures (isDemo: true)
│   ├── services/
│   │   ├── __tests__/            # Automated Vitest test suite
│   │   │   └── pipelineIntegrity.test.ts # Web pipeline integrity test cases
│   │   ├── indexedDbService.ts   # Persistent binary audio & metadata storage (4 stores)
│   │   ├── storageService.ts     # Unified storage coordinator
│   │   ├── transcriptionService.ts # Stage 1: Verbatim speech-to-text
│   │   ├── synthesisService.ts   # Stage 2: Academic note synthesis
│   │   ├── pipelineService.ts    # Central pipeline, guards, validation gates & locks
│   │   └── geminiService.ts      # Gemini client facade
│   ├── types/
│   │   └── index.ts              # Relational models (Recording, Transcript, Note)
│   ├── App.tsx                   # Main state coordinator
│   └── main.tsx                  # Web entry point
├── app/                          # Native Android Application (Kotlin + Compose)
│   ├── src/main/java/com/example/
│   │   ├── api/                  # Gemini REST client & Moshi models
│   │   ├── data/
│   │   │   ├── db/               # Room Database v3 (RecordingEntity, TranscriptEntity, NoteEntity, DAO)
│   │   │   ├── fixtures/         # Isolated Android DemoFixtures (isDemo = true)
│   │   │   ├── models/           # Relational domain models
│   │   │   ├── repository/       # LectureRepository (2-stage pipeline, validation & job locks)
│   │   │   └── service/          # TranscriptionService.kt & SynthesisService.kt
│   │   ├── recording/            # Foreground AudioRecordingService
│   │   ├── ui/                   # Jetpack Compose Screens & Theme
│   │   └── MainActivity.kt       # Navigation graph & root lifecycle
│   └── src/test/java/com/example/ # Unit & Robolectric Tests
│       ├── ExampleUnitTest.kt
│       ├── ExampleRobolectricTest.kt
│       ├── GreetingScreenshotTest.kt
│       └── PipelineIntegrityTest.kt # Comprehensive pipeline & acceptance criteria tests
├── build.gradle.kts              # Root build script
└── README.md
```

---

## 🛠️ Technology Stack

| Component | Web Application | Android Application |
| :--- | :--- | :--- |
| **Language & Runtime** | TypeScript 5.7, Node.js | Kotlin 2.0+, Coroutines, Flow |
| **UI Framework** | React 18, Tailwind CSS, Lucide Icons | Jetpack Compose, Material 3 |
| **Audio Capture** | Web Audio API, MediaRecorder | Android `MediaRecorder` Service |
| **Local Storage** | IndexedDB (`audio_blobs`, `recordings`, `transcripts`, `notes`) | Room SQLite Database v3 |
| **AI Synthesis** | Google Gemini 2.0 Flash REST API | Google Gemini 2.0 Flash (Retrofit/OkHttp/Moshi) |
| **Testing** | Vitest, TypeScript Strict Mode | JUnit 4, Robolectric, Roborazzi |

---

## 🧪 Verification & Acceptance Testing

- **Web Verification**:
  ```bash
  # Run pipeline integrity test suite
  npm test
  
  # Run TypeScript typecheck & production build
  npm run build
  ```
  *(Checks 18 unit tests, type safety, and creates optimized Vite production bundle)*

- **Android Verification**:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  .\gradlew.bat testDebugUnitTest
  ```
  *(Executes all unit tests, Robolectric tests, and pipeline integrity tests covering §5, §7, §8, §11, §12, §13, §18)*

---

## 🔒 Security & Privacy Notice

- **API Keys**: In development, keys are loaded from local `.env` files which are strictly excluded via `.gitignore`. For production web deployments, it is strongly recommended to proxy Gemini API calls through a lightweight backend service so that client browsers never hold secret API keys.
- **Data Privacy**: Spoken lecture audio and transcripts are stored exclusively in local client storage (IndexedDB on Web, private app storage on Android). Full transcripts and API credentials are never logged to console or Logcat.

---

## 📄 License
This project is licensed under the MIT License.


