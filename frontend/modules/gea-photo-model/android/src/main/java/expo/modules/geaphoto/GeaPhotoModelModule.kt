package expo.modules.geaphoto

import android.os.Bundle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Expo bridge to the Android runtime; inference runs on the native background queue. */
class GeaPhotoModelModule : Module() {
  private val model: Lazy<PhotoModel> = lazy {
    PhotoModel(requireNotNull(appContext.reactContext) { "Konteks Android belum tersedia." })
  }

  override fun definition() = ModuleDefinition {
    Name("GeaPhotoModel")
    AsyncFunction("verify") { uri: String, questId: String ->
      val verdict: Bundle = model.value.verify(uri, questId)
      verdict
    }
    OnDestroy { if (model.isInitialized()) model.value.close() }
  }
}
