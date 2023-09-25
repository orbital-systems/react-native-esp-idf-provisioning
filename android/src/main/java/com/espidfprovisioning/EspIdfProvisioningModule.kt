package com.espidfprovisioning

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.ScanResult
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat
import com.espressif.provisioning.ESPConstants
import com.espressif.provisioning.ESPDevice
import com.espressif.provisioning.ESPProvisionManager
import com.espressif.provisioning.WiFiAccessPoint
import com.espressif.provisioning.listeners.BleScanListener
import com.espressif.provisioning.listeners.ProvisionListener
import com.espressif.provisioning.listeners.ResponseListener
import com.espressif.provisioning.listeners.WiFiScanListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.lang.Exception
import java.util.ArrayList
import java.util.Base64

class EspIdfProvisioningModule internal constructor(context: ReactApplicationContext?) : EspIdfProvisioningSpec(context) {
  override fun getName(): String {
        return NAME
    }

  companion object {
      const val NAME = "EspIdfProvisioning"
  }

  private val espProvisionManager = ESPProvisionManager.getInstance(context)
  private val espDevices = HashMap<String, ESPDevice>()

  @ReactMethod
  override fun searchESPDevices(devicePrefix: String, transport: String, security: Int, promise: Promise?) {
    if (ActivityCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.ACCESS_FINE_LOCATION
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      promise?.reject(Error("Permission ACCESS_FINE_LOCATION is missing."))
      return;
    }

    val transport = when (transport) {
      "softap" -> ESPConstants.TransportType.TRANSPORT_SOFTAP
      "ble" -> ESPConstants.TransportType.TRANSPORT_BLE
      else -> ESPConstants.TransportType.TRANSPORT_BLE
    }
    val security = when (security) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    espDevices.clear()

    espProvisionManager.searchBleEspDevices(devicePrefix, object : BleScanListener {
      override fun scanStartFailed() {
        promise?.reject(Error("Scan could not be started."))
      }

      override fun onPeripheralFound(device: BluetoothDevice?, scanResult: ScanResult?) {
        // Can this happen?
        if (device == null) {
          return
        }

        // No device name
        val deviceName = scanResult?.scanRecord?.deviceName
        if (deviceName?.isEmpty() == true) {
          return
        }

        // Already found
        if (espDevices.containsKey(deviceName)) {
          return
        }

        val espDevice = ESPDevice(reactApplicationContext, transport, security)
        espDevice.bluetoothDevice = device

        if (scanResult?.scanRecord?.serviceUuids != null && scanResult.scanRecord?.serviceUuids?.size!! > 0) {
          espDevice.primaryServiceUuid = scanResult.scanRecord?.serviceUuids?.get(0).toString()
        }

        espDevices[deviceName!!] = espDevice
      }

      override fun scanCompleted() {
        promise?.resolve(espDevices.values.map { espDevice -> hashMapOf(
          "name" to espDevice.deviceName,
          "capabilities" to espDevice.deviceCapabilities,
          "security" to security,
          "transport" to transport,
          "username" to espDevice.userName,
          "versionInfo" to espDevice.versionInfo
        ) })
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })

    Handler(Looper.getMainLooper()).postDelayed({
      espProvisionManager.stopBleScan()
      promise?.resolve(espDevices)
    }, 5000)
  }

  override fun stopESPDevicesSearch() {
    if (ActivityCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.ACCESS_FINE_LOCATION
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      // No need to check permissions when stopping BLE scan
      return
    }
    espProvisionManager.stopBleScan()
  }

  override fun createESPDevice(
    deviceName: String,
    transport: String,
    security: Int,
    proofOfPossesion: String?,
    softAPPassword: String?,
    username: String?,
    promise: Promise?
  ) {
    // TODO: Can this be written shorter?
    val promise = object : Promise {
      override fun resolve(p0: Any?) {
        promise?.resolve(hashMapOf(
          "name" to espDevices[deviceName]?.deviceName,
          "capabilities" to espDevices[deviceName]?.deviceCapabilities,
          "security" to security,
          "transport" to transport,
          "username" to espDevices[deviceName]?.userName,
          "versionInfo" to espDevices[deviceName]?.versionInfo
        ))
      }

      override fun reject(p0: String?, p1: String?) {
        promise?.reject(p0, p1)
      }

      override fun reject(p0: String?, p1: Throwable?) {
        promise?.reject(p0, p1)
      }

      override fun reject(p0: String?, p1: String?, p2: Throwable?) {
        promise?.reject(p0, p1, p2)
      }

      override fun reject(p0: Throwable?) {
        promise?.reject(p0)
      }

      override fun reject(p0: Throwable?, p1: WritableMap?) {
        promise?.reject(p0, p1)
      }

      override fun reject(p0: String?, p1: WritableMap) {
        promise?.reject(p0, p1)
      }

      override fun reject(p0: String?, p1: Throwable?, p2: WritableMap?) {
        promise?.reject(p0, p1, p2)
      }

      override fun reject(p0: String?, p1: String?, p2: WritableMap) {
        promise?.reject(p0, p1, p2)
      }

      override fun reject(p0: String?, p1: String?, p2: Throwable?, p3: WritableMap?) {
        promise?.reject(p0, p1, p2, p3)
      }

      @Deprecated("Deprecated in Java", ReplaceWith("promise?.reject(Error(p0))"))
      override fun reject(p0: String?) {
        promise?.reject(Error(p0))
      }
    }

    searchESPDevices(deviceName, transport, security, promise)
  }

  // TODO: Permission check?
  override fun connect(deviceName: String, transport: String, promise: Promise?) {
    if (ActivityCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.ACCESS_FINE_LOCATION
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      promise?.reject(Error("Permission ACCESS_FINE_LOCATION is missing."))
      return;
    }

    if (ActivityCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.CHANGE_WIFI_STATE
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      promise?.reject(Error("Permission CHANGE_WIFI_STATE is missing."))
      return;
    }

    if (ActivityCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.ACCESS_WIFI_STATE
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      promise?.reject(Error("Permission ACCESS_WIFI_STATE is missing."))
      return;
    }

    if (ActivityCompat.checkSelfPermission(
        reactApplicationContext,
        Manifest.permission.ACCESS_NETWORK_STATE
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      promise?.reject(Error("Permission ACCESS_NETWORK_STATE is missing."))
      return;
    }

    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    // TODO: Investigate. Not sure how this works. Does connectToDevice really throw error?
    try {
      espDevices[deviceName]!!.connectToDevice()
      promise?.resolve(
        hashMapOf(
          "status" to "connected"
        )
      )
    } catch (e: Throwable) {
      promise?.reject(e)
    }
  }

  override fun sendData(deviceName: String, path: String, data: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    val data = Base64.getDecoder().decode(data)

    espDevices[deviceName]!!.sendDataToCustomEndPoint(path, data, object : ResponseListener {
      override fun onSuccess(returnData: ByteArray?) {
        val returnData = Base64.getEncoder().encode(returnData)
        promise?.resolve(returnData)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  override fun getProofOfPossesion(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevices[deviceName]!!.proofOfPossession)
  }

  override fun scanWifiList(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]!!.scanNetworks(object : WiFiScanListener {
      override fun onWifiListReceived(wifiList: ArrayList<WiFiAccessPoint>?) {
        promise?.resolve(wifiList!!.map { item -> hashMapOf(
          "ssid" to item.wifiName,
          "auth" to item.security,
        ) })
      }

      override fun onWiFiScanFailed(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  override fun disconnect(deviceName: String) {
    espDevices[deviceName]?.disconnectDevice()
  }

  override fun provision(deviceName: String, ssid: String, passphrase: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]!!.provision(ssid, passphrase, object : ProvisionListener {
      override fun createSessionFailed(e: Exception?) {
        promise?.reject(e)
      }

      override fun wifiConfigSent() {
        return
      }

      override fun wifiConfigFailed(e: Exception?) {
        promise?.reject(e)
      }

      override fun wifiConfigApplied() {
        return
      }

      override fun wifiConfigApplyFailed(e: Exception?) {
        promise?.reject(e)
      }

      override fun provisioningFailedFromDevice(failureReason: ESPConstants.ProvisionFailureReason?) {
        promise?.reject(Error(failureReason.toString()))
      }

      override fun deviceProvisioningSuccess() {
        promise?.resolve(hashMapOf(
          "status" to "success"
        ))
      }

      override fun onProvisioningFailed(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  override fun initializeSession(deviceName: String, sessionPath: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]!!.initSession(object : ResponseListener {
      override fun onSuccess(returnData: ByteArray?) {
        val returnData = Base64.getEncoder().encode(returnData)
        promise?.resolve(returnData)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }
}
