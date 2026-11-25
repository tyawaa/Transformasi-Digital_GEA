package expo.modules.geaphoto

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/** Real Android decoder and ONNX model, using generated fixtures excluded from release APKs. */
@RunWith(AndroidJUnit4::class)
class PhotoModelIntegrationTest {
  @Test
  fun packagedModelRecognizesObjectsWithoutReadableLabelsAndRejectsWrongQuests(): Unit {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val context: Context = instrumentation.targetContext
    val cases: JSONArray = JSONArray(instrumentation.context.assets.open("cases.json").bufferedReader().use { it.readText() })
    PhotoModel(context).use { model: PhotoModel ->
      for (position: Int in 0 until cases.length()) {
        val testCase = cases.getJSONObject(position)
        val file: File = File(context.cacheDir, testCase.getString("file"))
        try {
          instrumentation.context.assets.open(testCase.getString("file")).use { input -> file.outputStream().use { output -> input.copyTo(output) } }
          val verdict: Bundle = model.verify(Uri.fromFile(file).toString(), testCase.getString("questId"))
          Log.i("GEA_PHOTO_SMOKE", JSONObject()
            .put("event", "android_photo_model_check").put("case", position).put("file", file.name)
            .put("expected", testCase.getString("expected")).put("actual", verdict.getString("decision"))
            .put("similarity", verdict.getDouble("similarity")).put("margin", verdict.getDouble("margin"))
            .put("elapsedMs", verdict.getDouble("elapsedMs")).toString())
          assertEquals("Case $position: $testCase", testCase.getString("expected"), verdict.getString("decision"))
          assertTrue(verdict.getString("modelVersion")!!.endsWith(":object-match-android-v1"))
          assertEquals(64, verdict.getString("imageSha256")!!.length)
        } finally { file.delete() }
      }
    }
  }
}
