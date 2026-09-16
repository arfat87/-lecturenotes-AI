package com.example.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [NoteEntity::class, RecordingEntity::class, TranscriptEntity::class],
    version = 4,
    exportSchema = false
)
abstract class LectureDatabase : RoomDatabase() {
    abstract fun lectureDao(): LectureDao

    companion object {
        @Volatile
        private var INSTANCE: LectureDatabase? = null

        fun getDatabase(context: Context): LectureDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    LectureDatabase::class.java,
                    "lecture_notes_database"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
