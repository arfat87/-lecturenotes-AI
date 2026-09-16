package com.example.recording

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

class AudioRecordingService : Service() {

    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var isRecording = false
    private var isPaused = false
    private var elapsedSeconds = 0L
    private var timerJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val subject = intent?.getStringExtra(EXTRA_SUBJECT) ?: "Lecture"

        when (action) {
            ACTION_START -> startRecording(subject)
            ACTION_PAUSE -> pauseRecording()
            ACTION_RESUME -> resumeRecording()
            ACTION_STOP -> stopRecording()
        }

        return START_NOT_STICKY
    }

    private fun startRecording(subject: String) {
        if (isRecording) return

        createNotificationChannel()
        val notification = createNotification("Recording $subject...", "00:00")
        startForeground(NOTIFICATION_ID, notification)

        try {
            outputFile = File(cacheDir, "lecture_${System.currentTimeMillis()}.m4a")
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(64000)
                setAudioSamplingRate(44100)
                setOutputFile(outputFile?.absolutePath)
                prepare()
                start()
            }

            isRecording = true
            isPaused = false
            elapsedSeconds = 0L
            _recordingState.value = RecordingStatus(
                isRecording = true,
                isPaused = false,
                elapsedSeconds = 0,
                subject = subject,
                filePath = outputFile?.absolutePath
            )

            startTimer(subject)
        } catch (e: Exception) {
            e.printStackTrace()
            stopSelf()
        }
    }

    private fun pauseRecording() {
        if (isRecording && !isPaused && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                mediaRecorder?.pause()
                isPaused = true
                _recordingState.value = _recordingState.value.copy(isPaused = true)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun resumeRecording() {
        if (isRecording && isPaused && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                mediaRecorder?.resume()
                isPaused = false
                _recordingState.value = _recordingState.value.copy(isPaused = false)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun stopRecording() {
        timerJob?.cancel()
        try {
            if (isRecording) {
                mediaRecorder?.apply {
                    stop()
                    release()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            mediaRecorder = null
            isRecording = false
            isPaused = false

            val finalFile = outputFile
            _recordingState.value = RecordingStatus(
                isRecording = false,
                isPaused = false,
                elapsedSeconds = elapsedSeconds,
                subject = _recordingState.value.subject,
                filePath = finalFile?.absolutePath
            )

            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun startTimer(subject: String) {
        timerJob?.cancel()
        timerJob = scope.launch {
            while (isRecording) {
                delay(1000)
                if (!isPaused) {
                    elapsedSeconds++
                    val formatted = formatDuration(elapsedSeconds)
                    val amp = try { mediaRecorder?.maxAmplitude ?: 0 } catch (e: Exception) { 0 }
                    _recordingState.value = _recordingState.value.copy(
                        elapsedSeconds = elapsedSeconds,
                        currentAmplitude = amp
                    )
                    updateNotification("Recording $subject...", formatted)
                }
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Lecture Recording Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows recording notification while lecture is being captured"
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun createNotification(title: String, timeText: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("Duration: $timeText")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun updateNotification(title: String, timeText: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, createNotification(title, timeText))
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRecording()
    }

    companion object {
        const val CHANNEL_ID = "lecture_recording_channel"
        const val NOTIFICATION_ID = 1001

        const val ACTION_START = "ACTION_START"
        const val ACTION_PAUSE = "ACTION_PAUSE"
        const val ACTION_RESUME = "ACTION_RESUME"
        const val ACTION_STOP = "ACTION_STOP"
        const val EXTRA_SUBJECT = "EXTRA_SUBJECT"

        data class RecordingStatus(
            val isRecording: Boolean = false,
            val isPaused: Boolean = false,
            val elapsedSeconds: Long = 0,
            val currentAmplitude: Int = 0,
            val subject: String = "",
            val filePath: String? = null
        )

        private val _recordingState = MutableStateFlow(RecordingStatus())
        val recordingState: StateFlow<RecordingStatus> = _recordingState.asStateFlow()

        fun startService(context: Context, subject: String) {
            val intent = Intent(context, AudioRecordingService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_SUBJECT, subject)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun pauseService(context: Context) {
            val intent = Intent(context, AudioRecordingService::class.java).apply { action = ACTION_PAUSE }
            context.startService(intent)
        }

        fun resumeService(context: Context) {
            val intent = Intent(context, AudioRecordingService::class.java).apply { action = ACTION_RESUME }
            context.startService(intent)
        }

        fun stopService(context: Context) {
            val intent = Intent(context, AudioRecordingService::class.java).apply { action = ACTION_STOP }
            context.startService(intent)
        }

        fun formatDuration(seconds: Long): String {
            val mins = seconds / 60
            val secs = seconds % 60
            val hours = mins / 60
            val remMins = mins % 60
            return if (hours > 0) {
                String.format("%02d:%02d:%02d", hours, remMins, secs)
            } else {
                String.format("%02d:%02d", mins, secs)
            }
        }
    }
}
