package com.example.data.service

import com.example.data.models.SourceType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.URI
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

data class LinkValidationResult(val isValid: Boolean, val error: String? = null)

data class IngestedContent(
    val transcriptText: String,
    val detectedTitle: String? = null,
    val sourceType: SourceType,
    val sourceUrl: String,
    val durationSeconds: Long = 0L
)

class LinkIngestionService(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
) {
    companion object {
        private val PRIVATE_IP_PATTERNS = listOf(
            Pattern.compile("^localhost$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^127\\.\\d+\\.\\d+\\.\\d+$"),
            Pattern.compile("^0\\.0\\.0\\.0$"),
            Pattern.compile("^::1$"),
            Pattern.compile("^\\[::1\\]$"),
            Pattern.compile("^10\\.\\d+\\.\\d+\\.\\d+$"),
            Pattern.compile("^192\\.168\\.\\d+\\.\\d+$"),
            Pattern.compile("^172\\.(1[6-9]|2\\d|3[0-1])\\.\\d+\\.\\d+$"),
            Pattern.compile("^169\\.254\\.\\d+\\.\\d+$"), // Link-local / metadata services
            Pattern.compile(".*\\.local$", Pattern.CASE_INSENSITIVE),
            Pattern.compile(".*\\.internal$", Pattern.CASE_INSENSITIVE),
            Pattern.compile(".*\\.lan$", Pattern.CASE_INSENSITIVE)
        )
    }

    /**
     * Validates URL syntax and enforces SSRF protection against internal/private endpoints.
     */
    fun validateUrl(urlString: String?): LinkValidationResult {
        if (urlString.isNullOrBlank()) {
            return LinkValidationResult(false, "URL is required and cannot be empty.")
        }

        val uri = try {
            val trimmed = urlString.trim()
            URI.create(trimmed)
        } catch (e: Exception) {
            return LinkValidationResult(false, "Invalid URL format. Please provide a full URL starting with http:// or https://.")
        }

        val scheme = uri.scheme?.lowercase(Locale.ROOT)
        if (scheme != "http" && scheme != "https") {
            return LinkValidationResult(false, "Unsupported protocol: '$scheme'. Only http:// and https:// links are supported.")
        }

        val host = uri.host?.lowercase(Locale.ROOT) ?: ""
        if (host.isBlank()) {
            return LinkValidationResult(false, "URL is missing a valid host.")
        }

        val isPrivate = host == "localhost" ||
                host == "[::1]" ||
                host == "::1" ||
                host.startsWith("127.") ||
                host.contains("169.254") ||
                host == "metadata.google.internal" ||
                PRIVATE_IP_PATTERNS.any { it.matcher(host).matches() }

        if (isPrivate) {
            return LinkValidationResult(
                false,
                "SSRF Security Guard: Requests to local, internal, or private network addresses are strictly prohibited."
            )
        }

        return LinkValidationResult(true)
    }

    /**
     * Classifies URL into SourceType
     */
    fun detectSourceType(urlString: String): SourceType {
        val validation = validateUrl(urlString)
        if (!validation.isValid) {
            throw IllegalArgumentException(validation.error ?: "Invalid URL")
        }

        val uri = URI.create(urlString.trim())
        val host = uri.host?.lowercase(Locale.ROOT) ?: ""
        val path = uri.path?.lowercase(Locale.ROOT) ?: ""

        if (host.contains("youtube.com") || host.contains("youtu.be") ||
            host.contains("vimeo.com") || host.contains("dailymotion.com")) {
            return SourceType.URL_VIDEO
        }

        if (path.endsWith(".mp3") || path.endsWith(".m4a") ||
            path.endsWith(".wav") || path.endsWith(".aac") ||
            path.endsWith(".ogg") || host.contains("podcasts.google.com") ||
            host.contains("podcasts.apple.com") || host.contains("spotify.com") ||
            host.contains("soundcloud.com") || host.contains("podcast") ||
            path.contains("podcast")) {
            return SourceType.URL_AUDIO
        }

        return SourceType.URL_ARTICLE
    }

    /**
     * Ingests content from a URL.
     * Path A (Video/Audio) or Path B (Web Article)
     * Strictly fails with typed exceptions on unreachable/paywalled/unsupported sources.
     */
    suspend fun ingestUrl(
        url: String,
        onProgress: (String) -> Unit = {}
    ): IngestedContent = withContext(Dispatchers.IO) {
        val validation = validateUrl(url)
        if (!validation.isValid) {
            throw IllegalArgumentException(validation.error ?: "Invalid URL for ingestion.")
        }

        val sourceType = detectSourceType(url)
        onProgress("Connecting to $url...")

        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LectureNotesAI/1.0")
            .build()

        val response = try {
            client.newCall(request).execute()
        } catch (e: Exception) {
            throw IllegalStateException("UNREACHABLE: Network request failed: ${e.localizedMessage}")
        }

        response.use { resp ->
            if (!resp.isSuccessful) {
                when (resp.code) {
                    401, 403 -> throw IllegalStateException("PAYWALLED: This resource requires login or subscription (HTTP ${resp.code}).")
                    404 -> throw IllegalStateException("UNREACHABLE: Resource was not found (HTTP 404).")
                    else -> throw IllegalStateException("UNREACHABLE: Failed to fetch link content (HTTP ${resp.code}).")
                }
            }

            val contentType = resp.header("Content-Type", "")?.lowercase(Locale.ROOT) ?: ""
            if (!contentType.contains("text/html") && !contentType.contains("text/plain") && !contentType.contains("audio/")) {
                throw IllegalStateException("UNSUPPORTED_TYPE: URL did not return HTML, text, or audio content (Content-Type: $contentType).")
            }

            val bodyString = resp.body?.string()
                ?: throw IllegalStateException("Response body was empty.")

            onProgress("Extracting lecture text and stripping boilerplate...")
            val (title, text) = extractArticleText(bodyString)

            if (text.isBlank()) {
                throw IllegalStateException("Article extraction yielded no readable text (empty page content). The page may require JavaScript or authentication.")
            }

            val estimatedDuration = (text.split(Regex("\\s+")).filter { it.isNotBlank() }.size * 0.3).toLong().coerceAtLeast(60L)

            return@withContext IngestedContent(
                transcriptText = text,
                detectedTitle = title,
                sourceType = sourceType,
                sourceUrl = url,
                durationSeconds = estimatedDuration
            )
        }
    }

    /**
     * Pure HTML text extractor: Strips boilerplate, navigation, scripts, ads, and footers.
     */
    fun extractArticleText(html: String): Pair<String?, String> {
        if (html.isBlank()) return Pair(null, "")

        // Extract title
        var title: String? = null
        val ogTitleMatcher = Pattern.compile("<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE).matcher(html)
        if (ogTitleMatcher.find()) {
            title = ogTitleMatcher.group(1)?.trim()
        } else {
            val titleMatcher = Pattern.compile("<title[^>]*>([^<]+)</title>", Pattern.CASE_INSENSITIVE).matcher(html)
            if (titleMatcher.find()) {
                title = titleMatcher.group(1)?.trim()
            }
        }

        val cleaned = html
            .replace(Regex("(?i)<script\\b[^<]*(?:(?!</script>)<[^<]*)*</script>"), " ")
            .replace(Regex("(?i)<style\\b[^<]*(?:(?!</style>)<[^<]*)*</style>"), " ")
            .replace(Regex("(?i)<noscript\\b[^<]*(?:(?!</noscript>)<[^<]*)*</noscript>"), " ")
            .replace(Regex("(?i)<header\\b[^<]*(?:(?!</header>)<[^<]*)*</header>"), " ")
            .replace(Regex("(?i)<footer\\b[^<]*(?:(?!</footer>)<[^<]*)*</footer>"), " ")
            .replace(Regex("(?i)<nav\\b[^<]*(?:(?!</nav>)<[^<]*)*</nav>"), " ")
            .replace(Regex("(?i)<aside\\b[^<]*(?:(?!</aside>)<[^<]*)*</aside>"), " ")
            .replace(Regex("<[^>]+>"), " ")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")

        val normalized = cleaned
            .replace("\r\n", "\n")
            .replace("\t", " ")
            .replace(Regex("[ \t]{2,}"), " ")
            .replace(Regex("\n{3,}"), "\n\n")
            .trim()

        return Pair(title, normalized)
    }
}
