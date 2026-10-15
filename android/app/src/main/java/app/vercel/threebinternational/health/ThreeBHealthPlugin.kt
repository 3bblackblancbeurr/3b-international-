package app.vercel.threebinternational.health

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.ext.SdkExtensions
import androidx.activity.result.ActivityResult
import androidx.annotation.RequiresApi
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId

/** Read-only, foreground-only bridge. No native health storage, logging, or network. */
@CapacitorPlugin(name = "ThreeBHealth")
class ThreeBHealthPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var requestingPermission = false
    private var generation = 0L
    private var readJob: Job? = null
    private var permissionDialog: AlertDialog? = null
    private var permissionCall: PluginCall? = null
    private var permissionGeneration = 0L
    private var permissionSystemOpen = false

    @PluginMethod
    fun getStatus(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 28) {
            call.resolve(unavailable())
            return
        }
        run(call) { call.resolve(withTimeout(10_000) { Api28.status(context) }) }
    }

    @PluginMethod
    fun requestStepsPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 28) {
            call.resolve(permission(false))
            return
        }
        run(call) {
            if (requestingPermission) {
                call.reject("Une demande d’autorisation est déjà ouverte.", "PERMISSION_BUSY")
                return@run
            }
            if (!Api28.available(context)) {
                call.reject("Santé Connect doit être installé ou mis à jour.", "HEALTH_UNAVAILABLE")
                return@run
            }
            val token = generation
            requestingPermission = true
            permissionCall = call
            permissionGeneration = token
            val granted = try { withTimeout(10_000) { Api28.hasPermission(context) } }
            catch (failure: Exception) {
                if (permissionCall === call) { permissionCall = null; requestingPermission = false }
                throw failure
            }
            if (generation != token) return@run // Disconnect already rejected the saved call.
            if (granted) {
                permissionCall = null
                requestingPermission = false
                call.resolve(permission(true))
                return@run
            }
            if (activity == null || activity.isFinishing || !activity.hasWindowFocus()) {
                permissionCall = null
                requestingPermission = false
                call.reject("Ouvrez Santé 3B pour autoriser la lecture de vos pas.", "APP_NOT_VISIBLE")
                return@run
            }
            permissionDialog = AlertDialog.Builder(activity)
                .setTitle("Connecter mes pas à Santé 3B")
                .setMessage("3B lira uniquement vos nombres de pas, aujourd’hui et jusqu’aux 29 jours précédents. Aucun ajout ni modification dans Santé Connect.\n\nLes nombres sont utilisés dans votre journal sur cet appareil, sans envoi à 3B ni publicité. La sauvegarde du journal reste facultative. Vous pourrez retirer l’accès à tout moment dans Santé Connect.\n\nUne application comme Samsung Health peut alimenter Santé Connect après activation de son partage. Les téléphones compatibles peuvent aussi compter directement les pas.")
                .setPositiveButton("Continuer") { _, _ ->
                    try {
                        permissionDialog = null
                        permissionSystemOpen = true
                        startActivityForResult(call, Api28.permissionIntent(context), "stepsPermissionResult")
                    } catch (_: Exception) {
                        requestingPermission = false
                        permissionSystemOpen = false
                        permissionCall = null
                        call.reject("Impossible d’ouvrir les autorisations Santé Connect.", "PERMISSION_UNAVAILABLE")
                    }
                }
                .setNegativeButton("Annuler") { _, _ ->
                    requestingPermission = false
                    permissionDialog = null
                    permissionCall = null
                    call.resolve(permission(false))
                }
                .setOnCancelListener {
                    requestingPermission = false
                    permissionDialog = null
                    permissionCall = null
                    call.resolve(permission(false))
                }
                .show()
        }
    }

    @ActivityCallback
    private fun stepsPermissionResult(call: PluginCall?, result: ActivityResult) {
        permissionSystemOpen = false
        if (call == null) { requestingPermission = false; return }
        val token = permissionGeneration
        if (Build.VERSION.SDK_INT < 28) {
            call.resolve(permission(false))
            return
        }
        // Query the actual grant again: a cancelled result never implies consent.
        run(call) {
            try {
                withTimeout(10_000) {
                    val granted = Api28.available(context) && Api28.hasPermission(context)
                    if (token != generation) {
                        // A grant returned after Disconnect must not revive the session.
                        if (Api28.available(context)) Api28.revokeOnlySteps(context)
                    } else call.resolve(permission(granted))
                }
            } finally {
                if (permissionCall === call) permissionCall = null
                requestingPermission = false
            }
        }
    }

    @PluginMethod
    fun readSteps(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 28) {
            call.reject("Santé Connect n’est pas disponible sur ce téléphone.", "HEALTH_UNAVAILABLE")
            return
        }
        val raw = call.data.opt("days")
        val days = if (raw == null || raw == JSONObject.NULL) 7 else {
            if (raw !is Number || !raw.toDouble().isFinite() || raw.toDouble() != raw.toInt().toDouble()) {
                call.reject("Le nombre de jours doit être un entier de 1 à 30.", "INVALID_DAYS")
                return
            }
            raw.toInt()
        }
        if (days !in 1..30) {
            call.reject("Le nombre de jours doit être compris entre 1 et 30.", "INVALID_DAYS")
            return
        }
        run(call) {
            if (readJob?.isActive == true) {
                call.reject("Une actualisation des pas est déjà en cours.", "HEALTH_BUSY")
                return@run
            }
            if (activity == null || activity.isFinishing || !activity.hasWindowFocus()) {
                call.reject("Ouvrez Santé 3B pour actualiser vos pas.", "APP_NOT_VISIBLE")
                return@run
            }
            val token = generation
            val job = currentCoroutineContext()[Job]
            readJob = job
            try {
                withTimeout(40_000) {
                    if (!Api28.available(context)) {
                        call.reject("Santé Connect n’est pas disponible.", "HEALTH_UNAVAILABLE")
                        return@withTimeout
                    }
                    if (!Api28.hasPermission(context)) {
                        call.reject("Autorisez la lecture des pas dans Santé Connect.", "PERMISSION_DENIED")
                        return@withTimeout
                    }
                    currentCoroutineContext().ensureActive()
                    if (generation != token) throw CancellationException("health_disconnected")
                    val result = Api28.readDays(context, days) {
                        if (generation != token) throw CancellationException("health_disconnected")
                        if (activity == null || !activity.hasWindowFocus()) throw CancellationException("health_not_visible")
                    }
                    currentCoroutineContext().ensureActive()
                    if (generation != token) throw CancellationException("health_disconnected")
                    call.resolve(result)
                }
            } finally {
                if (readJob === job) readJob = null
            }
        }
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 28) {
            call.resolve(JSObject().put("opened", false))
            return
        }
        run(call) { call.resolve(JSObject().put("opened", Api28.openSettings(context))) }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 28) {
            call.resolve(permission(false))
            return
        }
        run(call) {
            generation++
            readJob?.cancel()
            permissionCall?.reject("La connexion a été interrompue.", "HEALTH_CANCELLED")
            permissionCall = null
            permissionDialog?.setOnCancelListener(null)
            permissionDialog?.dismiss()
            permissionDialog = null
            // Do not launch a second system permission flow while the first still
            // owns the screen. Its eventual result is invalidated by generation.
            if (!permissionSystemOpen) requestingPermission = false
            if (!Api28.available(context)) {
                // Do not pretend to have revoked grants in an unavailable provider.
                call.reject("Ouvrez les réglages Santé Connect pour retirer l’accès.", "HEALTH_UNAVAILABLE")
                return@run
            }
            if (!withTimeout(10_000) { Api28.revokeOnlySteps(context) }) {
                call.reject("Retirez la lecture des pas dans les réglages Santé Connect.", "REVOKE_IN_SETTINGS")
                return@run
            }
            call.resolve(permission(false))
        }
    }

    private fun run(call: PluginCall, operation: suspend () -> Unit) {
        scope.launch {
            try { operation() }
            catch (_: TimeoutCancellationException) {
                call.reject("L’actualisation a pris trop de temps. Réessayez.", "HEALTH_TIMEOUT")
            }
            catch (cancelled: CancellationException) {
                call.reject("L’actualisation a été interrompue.", "HEALTH_CANCELLED")
                throw cancelled
            }
            catch (_: SecurityException) {
                call.reject("L’autorisation de lecture des pas a été retirée.", "PERMISSION_DENIED")
            }
            catch (_: Exception) {
                // Never attach provider exceptions: they can contain health data.
                call.reject("Santé Connect est temporairement indisponible. Réessayez.", "HEALTH_READ_FAILED")
            }
        }
    }

    override fun handleOnDestroy() {
        permissionDialog?.setOnCancelListener(null)
        permissionDialog?.dismiss()
        permissionDialog = null
        scope.cancel()
        super.handleOnDestroy()
    }

    private fun permission(granted: Boolean) = JSObject().put("permission", if (granted) "granted" else "not-granted")

    private fun unavailable() = JSObject().apply {
        put("platform", "android"); put("source", "health-connect")
        put("available", false); put("status", "unavailable")
        put("permission", "not-granted"); put("onDeviceSteps", false)
    }

    /** Lazy class boundary: no Health Connect/java.time type in the outer class ABI.
     * This object is never initialized on API 24–27, including reflection by Capacitor. */
    @RequiresApi(28)
    private object Api28 {
        private const val PROVIDER = "com.google.android.apps.healthdata"
        private val readSteps = HealthPermission.getReadPermission(StepsRecord::class)

        fun available(context: Context) = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

        suspend fun hasPermission(context: Context) =
            readSteps in HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()

        suspend fun status(context: Context): JSObject {
            val status = HealthConnectClient.getSdkStatus(context)
            val available = status == HealthConnectClient.SDK_AVAILABLE
            return JSObject().apply {
                put("platform", "android"); put("source", "health-connect")
                put("available", available)
                put("status", when (status) {
                    HealthConnectClient.SDK_AVAILABLE -> "available"
                    HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "needs-update"
                    else -> "unavailable"
                })
                put("permission", if (available && hasPermission(context)) "granted" else "not-granted")
                put("onDeviceSteps", available && Build.VERSION.SDK_INT >= 34 &&
                    SdkExtensions.getExtensionVersion(34) >= 20 &&
                    context.packageManager.hasSystemFeature(PackageManager.FEATURE_SENSOR_STEP_COUNTER))
            }
        }

        fun permissionIntent(context: Context): Intent =
            PermissionController.createRequestPermissionResultContract().createIntent(context, setOf(readSteps))

        suspend fun readDays(context: Context, count: Int, ensureCurrent: () -> Unit): JSObject {
            val client = HealthConnectClient.getOrCreate(context)
            val zone = ZoneId.systemDefault()
            val now = Instant.now()
            val today = now.atZone(zone).toLocalDate()
            val rows = JSArray()
            for (offset in count - 1 downTo 0) {
                currentCoroutineContext().ensureActive()
                ensureCurrent()
                val date = today.minusDays(offset.toLong())
                val start = date.atStartOfDay(zone).toInstant()
                val nextDay = date.plusDays(1).atStartOfDay(zone).toInstant()
                val end = if (nextDay.isAfter(now)) now else nextDay
                // Instant bounds use the phone's current calendar zone correctly even
                // across 23/25-hour DST days. No fixed 24-hour slicing or raw-record sum.
                val total = if (start.isBefore(end)) client.aggregate(AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                ))[StepsRecord.COUNT_TOTAL] else null
                rows.put(JSObject().apply {
                    put("date", date.toString())
                    put("steps", total ?: JSONObject.NULL)
                })
            }
            currentCoroutineContext().ensureActive()
            ensureCurrent()
            return JSObject().apply {
                put("source", "health-connect"); put("syncedAt", Instant.now().toString())
                put("days", rows)
            }
        }

        suspend fun revokeOnlySteps(context: Context): Boolean {
            val controller = HealthConnectClient.getOrCreate(context).permissionController
            val granted = controller.getGrantedPermissions()
            if (readSteps !in granted) return true
            // SDK1.1.0 offers revokeAllPermissions only. Guard so future health
            // features cannot silently lose their grants when steps disconnect.
            if (granted.any { it != readSteps }) return false
            controller.revokeAllPermissions()
            return !hasPermission(context)
        }

        fun openSettings(context: Context): Boolean {
            val status = HealthConnectClient.getSdkStatus(context)
            val intent = when (status) {
                HealthConnectClient.SDK_AVAILABLE -> Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ->
                    Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$PROVIDER&url=healthconnect%3A%2F%2Fonboarding"))
                        .setPackage("com.android.vending")
                        .putExtra("overlay", true).putExtra("callerId", context.packageName)
                else -> return false
            }.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            return try { context.startActivity(intent); true }
            catch (_: Exception) {
                if (status != HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return false
                try {
                    context.startActivity(Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/apps/details?id=$PROVIDER"))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    true
                } catch (_: Exception) { false }
            }
        }
    }
}
