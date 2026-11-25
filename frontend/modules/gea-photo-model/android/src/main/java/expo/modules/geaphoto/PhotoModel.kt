package expo.modules.geaphoto

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import org.json.JSONObject
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.security.MessageDigest
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private data class PhotoTarget(val questId: String, val poi: String, val similarity: Double, val margin: Double)
private data class ImageQuality(val brightness: Double, val sharpness: Double)
private data class ModelManifest(
  val version: String,
  val modelHash: String,
  val featureHash: String,
  val references: List<String>,
  val targets: List<PhotoTarget>
)

private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
  .digest(bytes).joinToString("") { byte: Byte -> "%02x".format(byte) }

private fun parseManifest(text: String): ModelManifest {
  val json: JSONObject = JSONObject(text)
  require(json.getInt("schemaVersion") == 1 && json.getInt("dimensions") == 384) { "Format model Android tidak didukung." }
  val referencesJson = json.getJSONArray("referenceTargets")
  val targetsJson = json.getJSONArray("targets")
  val references: List<String> = List(referencesJson.length()) { position: Int -> referencesJson.getString(position) }
  val targets: List<PhotoTarget> = List(targetsJson.length()) { position: Int ->
    val target: JSONObject = targetsJson.getJSONObject(position)
    PhotoTarget(target.getString("questId"), target.getString("poi"), target.getDouble("similarity"), target.getDouble("margin"))
  }
  require(targets.size == 7 && targets.map { it.questId }.distinct().size == 7) { "Katalog model Android tidak lengkap." }
  require(targets.all { target: PhotoTarget -> references.count { it == target.poi } >= 2 }) { "Referensi model kurang dari dua per objek." }
  return ModelManifest(json.getString("modelVersion"), json.getString("modelSha256"), json.getString("featuresSha256"), references, targets)
}

private fun normalizedPixels(image: Bitmap): FloatArray {
  val ratio: Double = min(224.0 / image.width, 224.0 / image.height)
  val width: Int = max(1, (image.width * ratio).roundToInt())
  val height: Int = max(1, (image.height * ratio).roundToInt())
  require(min(width, height) >= 3) { "Foto terlalu memanjang. Ambil ulang dengan objek memenuhi bingkai." }
  val resized: Bitmap = Bitmap.createScaledBitmap(image, width, height, true)
  val square: Bitmap = Bitmap.createBitmap(224, 224, Bitmap.Config.ARGB_8888)
  val canvas: Canvas = Canvas(square)
  canvas.drawColor(Color.rgb(124, 116, 104))
  canvas.drawBitmap(resized, ((224 - width) / 2).toFloat(), ((224 - height) / 2).toFloat(), null)
  val colors: IntArray = IntArray(224 * 224)
  square.getPixels(colors, 0, 224, 0, 0, 224, 224)
  square.recycle()
  if (resized !== image) resized.recycle()
  val output: FloatArray = FloatArray(3 * 224 * 224)
  for (position: Int in colors.indices) {
    output[position] = (Color.red(colors[position]) / 255f - 0.485f) / 0.229f
    output[224 * 224 + position] = (Color.green(colors[position]) / 255f - 0.456f) / 0.224f
    output[2 * 224 * 224 + position] = (Color.blue(colors[position]) / 255f - 0.406f) / 0.225f
  }
  return output
}

private fun imageQuality(image: Bitmap): ImageQuality {
  val ratio: Double = min(1.0, min(512.0 / image.width, 512.0 / image.height))
  val width: Int = max(1, (image.width * ratio).roundToInt())
  val height: Int = max(1, (image.height * ratio).roundToInt())
  require(min(width, height) >= 3) { "Foto terlalu memanjang. Ambil ulang dengan objek memenuhi bingkai." }
  val resized: Bitmap = Bitmap.createScaledBitmap(image, width, height, true)
  val colors: IntArray = IntArray(width * height)
  resized.getPixels(colors, 0, width, 0, 0, width, height)
  if (resized !== image) resized.recycle()
  val gray: DoubleArray = DoubleArray(colors.size) { position: Int ->
    val color: Int = colors[position]
    (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)).roundToInt().toDouble()
  }
  val laplacian: DoubleArray = DoubleArray((width - 2) * (height - 2)) { position: Int ->
    val x: Int = position % (width - 2) + 1
    val y: Int = position / (width - 2) + 1
    gray[y * width + x - 1] + gray[y * width + x + 1] + gray[(y - 1) * width + x] + gray[(y + 1) * width + x] - 4 * gray[y * width + x]
  }
  val mean: Double = laplacian.average()
  return ImageQuality(gray.average(), laplacian.sumOf { value: Double -> (value - mean) * (value - mean) } / laplacian.size)
}

/** Connector to the packaged Android assets, image decoder, and ONNX CPU runtime. No network calls. */
class PhotoModel(private val context: Context) : AutoCloseable {
  private val lock: ReentrantLock = ReentrantLock()
  private val manifest: ModelManifest = parseManifest(context.assets.open("gea_photo/manifest.json").bufferedReader().use { it.readText() })
  private val features: FloatArray = loadFeatures()
  private val environment: OrtEnvironment = OrtEnvironment.getEnvironment()
  private val session: OrtSession = loadSession()

  private fun loadFeatures(): FloatArray {
    val bytes: ByteArray = context.assets.open("gea_photo/features.bin").use { it.readBytes() }
    require(sha256(bytes) == manifest.featureHash && bytes.size == manifest.references.size * 384 * 4) { "Data referensi model rusak; instal ulang APK." }
    val output: FloatArray = FloatArray(bytes.size / 4)
    ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer().get(output)
    require(output.all { it.isFinite() }) { "Vektor referensi model tidak valid." }
    return output
  }

  private fun loadSession(): OrtSession {
    val bytes: ByteArray = context.assets.open("gea_photo/model.onnx").use { it.readBytes() }
    require(sha256(bytes) == manifest.modelHash) { "Bobot model rusak; instal ulang APK." }
    return OrtSession.SessionOptions().use { options: OrtSession.SessionOptions ->
      options.setIntraOpNumThreads(2)
      options.setInterOpNumThreads(1)
      environment.createSession(bytes, options)
    }
  }

  private fun embedding(image: Bitmap): FloatArray {
    val pixels: FloatArray = normalizedPixels(image)
    return OnnxTensor.createTensor(environment, FloatBuffer.wrap(pixels), longArrayOf(1, 3, 224, 224)).use { tensor: OnnxTensor ->
      session.run(mapOf("pixels" to tensor)).use { result: OrtSession.Result ->
        val output = result.get("embedding").orElseThrow { IllegalStateException("Output embedding model tidak tersedia.") }
        check(output is OnnxTensor) { "Output model bukan tensor." }
        val query: FloatArray = FloatArray(384)
        output.floatBuffer.get(query)
        check(query.all { it.isFinite() }) { "Model menghasilkan vektor tidak valid." }
        query
      }
    }
  }

  private fun scores(query: FloatArray): Map<String, Double> = manifest.targets.associate { target: PhotoTarget ->
    val similarities: List<Double> = manifest.references.indices.filter { manifest.references[it] == target.poi }.map { position: Int ->
      query.indices.sumOf { dimension: Int -> features[position * 384 + dimension].toDouble() * query[dimension] }
    }
    target.poi to similarities.sortedDescending().take(2).average()
  }

  fun verify(uri: String, questId: String): Bundle = lock.withLock { verifyPhoto(uri, questId) }

  private fun verifyPhoto(uri: String, questId: String): Bundle {
    val startedAt: Long = System.nanoTime()
    val target: PhotoTarget = manifest.targets.find { it.questId == questId }
      ?: throw IllegalArgumentException("Quest foto tidak terdaftar: $questId")
    val parsed: Uri = Uri.parse(uri)
    require(parsed.scheme == "file") { "Foto harus berasal dari file kamera lokal." }
    val file: File = File(requireNotNull(parsed.path)).canonicalFile
    require(file.isFile && file.length() in 1L..6L * 1024 * 1024) { "File foto tidak tersedia atau melebihi 6 MiB: $uri" }
    val bytes: ByteArray = file.readBytes()
    val bounds: BitmapFactory.Options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    require(bounds.outMimeType in listOf("image/jpeg", "image/png")) { "Foto harus JPEG atau PNG." }
    require(min(bounds.outWidth, bounds.outHeight) >= 224 && bounds.outWidth.toLong() * bounds.outHeight <= 24_000_000) { "Foto harus minimal 224 piksel per sisi dan maksimal 24 megapiksel." }
    val image: Bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      ?: throw IllegalArgumentException("Foto JPEG/PNG gagal dibaca: $uri")
    try {
      val quality: ImageQuality = imageQuality(image)
      val scores: Map<String, Double> = scores(embedding(image))
      val similarity: Double = scores.getValue(target.poi)
      val margin: Double = similarity - scores.filterKeys { it != target.poi }.values.max()
      val clear: Boolean = quality.brightness >= 20 && quality.sharpness >= 12
      val accepted: Boolean = clear && similarity >= target.similarity && margin >= target.margin
      val reason: String = when {
        !clear -> "Foto kurang jelas. Tambah cahaya dan tahan kamera tetap stabil."
        !accepted -> "Objek belum dapat dipastikan. Posisikan objek di tengah dan foto lebih dekat dari depan."
        else -> "Objek sesuai dengan target quest. Label nama tidak wajib terlihat."
      }
      return Bundle().apply {
        putString("questId", questId)
        putString("decision", if (accepted) "accepted" else "retake")
        putString("reason", reason)
        putString("target", target.poi)
        putString("matched", requireNotNull(scores.maxByOrNull { it.value }).key)
        putDouble("similarity", similarity)
        putDouble("margin", margin)
        putDouble("brightness", quality.brightness)
        putDouble("sharpness", quality.sharpness)
        putString("modelVersion", manifest.version)
        putString("imageSha256", sha256(bytes))
        putDouble("elapsedMs", (System.nanoTime() - startedAt) / 1_000_000.0)
      }
    } finally { image.recycle() }
  }

  override fun close(): Unit = lock.withLock { session.close() }
}
