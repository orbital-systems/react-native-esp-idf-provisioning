package com.espidfprovisioning

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.espressif.provisioning.DeviceConnectionEvent
import com.espressif.provisioning.ESPConstants
import com.espressif.provisioning.ESPDevice
import com.espressif.provisioning.ESPProvisionManager
import com.espressif.provisioning.WiFiAccessPoint
import com.espressif.provisioning.listeners.BleScanListener
import com.espressif.provisioning.listeners.ProvisionListener
import com.espressif.provisioning.listeners.ResponseListener
import com.espressif.provisioning.listeners.WiFiScanListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import org.greenrobot.eventbus.EventBus
import org.greenrobot.eventbus.Subscribe
import org.greenrobot.eventbus.ThreadMode
import org.json.JSONException
import org.json.JSONObject
import java.lang.Exception
import java.util.ArrayList
import java.util.Base64


inline fun<T> T?.guard(nullClause: () -> Nothing): T {
  return this ?: nullClause()
}

fun BluetoothDevice.isAlreadyConnected(): Boolean {
  return try {
    javaClass.getMethod("isConnected").invoke(this) as? Boolean? ?: false
  } catch (e: Throwable) {
    false
  }
}

@OptIn(kotlin.ExperimentalStdlibApi::class) 
class EspIdfProvisioningModule internal constructor(context: ReactApplicationContext?) : EspIdfProvisioningSpec(context) {
  override fun getName(): String {
    return NAME
  }

  companion object {
      const val NAME = "EspIdfProvisioning"
  }

  private val espProvisionManager = ESPProvisionManager.getInstance(context)
  private val espDevices = HashMap<String, ESPDevice>()
  private val bluetoothAdapter = (context?.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter

  private fun hasBluetoothPermissions(): Boolean {
    if (Build.VERSION.SDK_INT <= 30) {
      return ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
             ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
    }

    return ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
           ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
  }

  private fun hasWifiPermission(): Boolean {
    return ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.CHANGE_WIFI_STATE) == PackageManager.PERMISSION_GRANTED &&
           ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_WIFI_STATE) == PackageManager.PERMISSION_GRANTED &&
           ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_NETWORK_STATE) == PackageManager.PERMISSION_GRANTED
  }

  private fun hasFineLocationPermission(): Boolean {
    return ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun searchESPDevices(devicePrefix: String, transport: String, security: Double, promise: Promise?) {
    val transportEnum = when (transport) {
      "softap" -> ESPConstants.TransportType.TRANSPORT_SOFTAP
      "ble" -> ESPConstants.TransportType.TRANSPORT_BLE
      else -> ESPConstants.TransportType.TRANSPORT_BLE
    }
    val securityEnum = when (security.toInt()) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    espDevices.clear()
    if (transportEnum == ESPConstants.TransportType.TRANSPORT_BLE) {
      // Permission checks
      if (!hasBluetoothPermissions() || !hasFineLocationPermission()) {
        promise?.reject(Error("Missing one of the following permissions: BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, BLUETOOTH_SCAN, ACCESS_FINE_LOCATION"))
        return
      }

      espProvisionManager.searchBleEspDevices(devicePrefix, object : BleScanListener {
        override fun scanStartFailed() {
          promise?.reject(Error("Scan could not be started."))
        }

        override fun onPeripheralFound(device: BluetoothDevice?, scanResult: ScanResult?) {
          // Can this happen?
          if (device == null) {
            return
          }

          val deviceName = scanResult?.scanRecord?.deviceName

          // No device name
          if (deviceName.isNullOrEmpty()) {
            return
          }

          val serviceUuid = scanResult.scanRecord?.serviceUuids?.getOrNull(0)?.toString()
          if (serviceUuid != null && !espDevices.containsKey(deviceName)) {
            val espDevice = ESPDevice(reactApplicationContext, transportEnum, securityEnum)
            espDevice.bluetoothDevice = device
            espDevice.deviceName = deviceName
            espDevice.primaryServiceUuid = serviceUuid
            espDevices[deviceName] = espDevice
          }
        }

        override fun scanCompleted() {
          if (espDevices.size == 0) {
            promise?.reject(Error("No bluetooth device found with given prefix"))
            return
          }

          val resultArray = Arguments.createArray()

          espDevices.values.forEach { espDevice ->
            val resultMap = Arguments.createMap()
            resultMap.putString("name", espDevice.deviceName)
            resultMap.putString("transport", transport)
            resultMap.putInt("security", security.toInt())

            resultArray.pushMap(resultMap)
          }

          promise?.resolve(resultArray)
        }

        override fun onFailure(e: Exception?) {
          if (e != null) {
            promise?.reject(e)
          }
        }
      })
    } else {
      if (!hasWifiPermission() || !hasFineLocationPermission()) {
        promise?.reject(Error("Missing one of the following permissions: CHANGE_WIFI_STATE, ACCESS_WIFI_STATE, ACCESS_NETWORK_STATE, ACCESS_FINE_LOCATION"))
      }

      espProvisionManager.searchWiFiEspDevices(devicePrefix, object : WiFiScanListener {
        override fun onWifiListReceived(wifiList: ArrayList<WiFiAccessPoint>?) {
          if (wifiList?.size == 0) {
            promise?.reject(Error("No wifi device found with given prefix"))
            return
          }

          val resultArray = Arguments.createArray()

          wifiList?.forEach { wiFiAccessPoint ->
            val espDevice = ESPDevice(reactApplicationContext, transportEnum, securityEnum)
            espDevice.wifiDevice = wiFiAccessPoint
            espDevice.deviceName = wiFiAccessPoint.wifiName
            espDevices[wiFiAccessPoint.wifiName] = espDevice

            val resultMap = Arguments.createMap()

            resultMap.putString("name", wiFiAccessPoint.wifiName)
            resultMap.putString("transport", transport)
            resultMap.putInt("security", wiFiAccessPoint.security)

            resultArray.pushMap(resultMap)
          }

          promise?.resolve(resultArray)
        }

        override fun onWiFiScanFailed(e: Exception?) {
          if (e != null) {
            promise?.reject(e)
          }
        }
      })
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun stopESPDevicesSearch() {
    // Permission checks
    if (!hasBluetoothPermissions() || !hasFineLocationPermission()) {
      // If we don't have permissions we are probably not scanning either, so just return
      return
    }

    espProvisionManager.stopBleScan()
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun createESPDevice(
    deviceName: String,
    transport: String,
    security: Double,
    proofOfPossession: String?,
    softAPPassword: String?,
    username: String?,
    promise: Promise?
  ) {
    // Permission checks
    if (!hasBluetoothPermissions()) {
      promise?.reject(Error("Missing one of the following permissions: BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, BLUETOOTH_SCAN"))
      return
    }

    val transportEnum = when (transport) {
      "softap" -> ESPConstants.TransportType.TRANSPORT_SOFTAP
      "ble" -> ESPConstants.TransportType.TRANSPORT_BLE
      else -> ESPConstants.TransportType.TRANSPORT_BLE
    }
    val securityEnum = when (security.toInt()) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    // If no ESP device found in list (no scan has been performed), create a new one
    var espDevice = espDevices[deviceName];
    if (espDevice == null) {
      espDevice = espProvisionManager.createESPDevice(transportEnum, securityEnum)
      espDevices[deviceName] = espDevice
    } else {
      // This looks weird on first glance, but it catches the edge case when
      // a user unpairs the device from Android bluetooth menu and then tries to reconnect
      // to it.
      //
      // I found out it connects just fine but fails to write characteristics and is
      // disconnected immediately after trying to write characteristic (by the device).
      //
      // Pre-emptively disconnecting the device upon creation if it's in bond state NONE seems
      // to fix this issue. Don't ask me why ;)
      if (espDevice.bluetoothDevice?.bondState == BluetoothDevice.BOND_NONE) {
        espDevice.disconnectDevice()
      }
    }

    if (transportEnum == ESPConstants.TransportType.TRANSPORT_BLE) {
      // If the bluetooth device does not exist, try using the bonded one (if it exists)
      if (espDevice?.bluetoothDevice == null) {
        espDevice?.bluetoothDevice = bluetoothAdapter.bondedDevices.find { bondedDevice ->
          bondedDevice.name == deviceName
        }
      }

      // If the bluetooth device exists and we have a primary service uuid, we will be able to connect to it
      if (espDevice?.bluetoothDevice != null && espDevice.primaryServiceUuid != null) {
        espDevice.proofOfPossession = proofOfPossession
        if (username != null) {
          espDevice.userName = username
        }

        val result = Arguments.createMap()
        result.putString("name", espDevice.deviceName)
        result.putString("transport", transport)
        result.putInt("security", security.toInt())

        promise?.resolve(result)
        return
      }
    } else {
      if (espDevice?.wifiDevice == null) {
        val wifiDevice = WiFiAccessPoint()
        wifiDevice.wifiName = deviceName
        wifiDevice.password = softAPPassword

        espDevice?.wifiDevice = wifiDevice
      }

      val result = Arguments.createMap()
      result.putString("name", espDevice?.deviceName)
      result.putString("transport", transport)
      result.putInt("security", security.toInt())

      promise?.resolve(result)
      return
    }

    // Exhausted our other options, perform search in hope of finding the device
    searchESPDevices(deviceName, transport, security, object : Promise {
      override fun resolve(p0: Any?) {
        // If search does not find the device, consider it not found
        val espDevice = espDevices[deviceName].guard {
          promise?.reject(Error("Device not found."))
          return
        }

        // Configure proof of possession
        espDevice.proofOfPossession = proofOfPossession
        if (username != null) {
          espDevice.userName = username
        }

        val result = Arguments.createMap()
        result.putString("name", espDevice.deviceName)
        result.putString("transport", transport)
        result.putInt("security", security.toInt())

        promise?.resolve(result)
      }

      override fun reject(message: String) {
        promise?.reject(message)
      }

      override fun reject(code: String, userInfo: WritableMap) {
        promise?.reject(code, userInfo)
      }

      override fun reject(code: String, message: String?) {
        promise?.reject(code, message)
      }

      override fun reject(code: String, message: String?, userInfo: WritableMap) {
        promise?.reject(code, message, userInfo)
      }

      override fun reject(code: String, message: String?, throwable: Throwable?) {
        promise?.reject(code, message, throwable)
      }

      override fun reject(code: String, throwable: Throwable?) {
        promise?.reject(code, throwable)
      }

      override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
        promise?.reject(code, throwable, userInfo)
      }

      override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {
        promise?.reject(code, message, throwable, userInfo)
      }

      override fun reject(throwable: Throwable) {
        promise?.reject(throwable)
      }

      override fun reject(throwable: Throwable, userInfo: WritableMap) {
        promise?.reject(throwable, userInfo)
      }
    })
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun connect(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    if (espDevice.transportType == ESPConstants.TransportType.TRANSPORT_SOFTAP) {
      // Permission checks
      if (!hasWifiPermission() || !hasFineLocationPermission()) {
        promise?.reject(Error("Missing one of the following permissions: CHANGE_WIFI_STATE, ACCESS_WIFI_STATE, ACCESS_NETWORK_STATE, ACCESS_FINE_LOCATION"))
        return
      }
    }

    // If device is already connected, exit early
    if (espDevice.transportType == ESPConstants.TransportType.TRANSPORT_BLE &&
        espDevice.bluetoothDevice?.isAlreadyConnected() == true) {
      val result = Arguments.createMap()
      result.putString("status", "connected")
      promise?.resolve(result)
      return
    }

    espDevice.connectToDevice()

    EventBus.getDefault().register(object {
      @Subscribe(threadMode = ThreadMode.MAIN)
      fun onEvent(event: DeviceConnectionEvent) {
        when (event.eventType) {
          ESPConstants.EVENT_DEVICE_CONNECTED -> {
            val result = Arguments.createMap()
            result.putString("status", "connected")
            promise?.resolve(result)
          }
          ESPConstants.EVENT_DEVICE_CONNECTION_FAILED -> {
            promise?.reject(Error("Device connection failed."))
          }
          else -> {
            // Do nothing
          }
        }

        // Unregister event listener after 1 event received
        EventBus.getDefault().unregister(this)
      }
    })
  }

  @ReactMethod
  override fun sendData(deviceName: String, path: String, data: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    val decodedData = Base64.getDecoder().decode(data)
    espDevice.sendDataToCustomEndPoint(path, decodedData, object : ResponseListener {
      override fun onSuccess(returnData: ByteArray?) {
        val encodedData = Base64.getEncoder().encode(returnData).toString(Charsets.UTF_8)
        promise?.resolve(encodedData)
      }

      override fun onFailure(e: Exception?) {
        if (e != null) {
          promise?.reject(e)
        }
      }
    })
  }

  @ReactMethod
  override fun scanWifiList(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevice.scanNetworks(object : WiFiScanListener {
      override fun onWifiListReceived(wifiList: ArrayList<WiFiAccessPoint>?) {
        val resultArray = Arguments.createArray()

        wifiList?.forEach { item ->
          val resultMap = Arguments.createMap()
          resultMap.putString("ssid", item.wifiName)
          resultMap.putInt("rssi", item.rssi)
          resultMap.putInt("auth", item.security)
          resultArray.pushMap(resultMap)
        }

        promise?.resolve(resultArray)
      }

      override fun onWiFiScanFailed(e: Exception?) {
        if (e != null) {
          promise?.reject(e)
        }
      }
    })
  }

  @ReactMethod
  override fun disconnect(deviceName: String) {
    espDevices[deviceName]?.disconnectDevice()
  }

  @ReactMethod
  override fun provision(deviceName: String, ssid: String, passphrase: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevice.provision(ssid, passphrase, object : ProvisionListener {
      override fun createSessionFailed(e: Exception?) {
        if (e != null) {
          promise?.reject(e)
        }
      }

      override fun wifiConfigSent() {
        return
      }

      override fun wifiConfigFailed(e: Exception?) {
        if (e != null) {
          promise?.reject(e)
        }
      }

      override fun wifiConfigApplied() {
        return
      }

      override fun wifiConfigApplyFailed(e: Exception?) {
        if (e != null) {
          promise?.reject(e)
        }
      }

      override fun provisioningFailedFromDevice(failureReason: ESPConstants.ProvisionFailureReason?) {
        promise?.reject(Error(failureReason.toString()))
      }

      override fun deviceProvisioningSuccess() {
        val result = Arguments.createMap()
        result.putString("status", "success")
        promise?.resolve(result)
      }

      override fun onProvisioningFailed(e: Exception?) {
        if (e != null) {
          promise?.reject(e)
        }
      }
    })
  }

  @ReactMethod
  override fun getProofOfPossession(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevice.proofOfPossession)
  }

  @ReactMethod
  override fun setProofOfPossession(deviceName: String, proofOfPossession: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevice.proofOfPossession = proofOfPossession
    promise?.resolve(proofOfPossession)
  }

  @ReactMethod
  override fun getUsername(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevice.userName)
  }

  @ReactMethod
  override fun setUsername(deviceName: String, username: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevice.userName = username
    promise?.resolve(username)
  }

  @ReactMethod
  override fun getDeviceName(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevice.deviceName)
  }

  @ReactMethod
  override fun setDeviceName(deviceName: String, newDeviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    if (newDeviceName == "") {
      promise?.reject(Error("Cannot set empty device name."))
      return
    }

    // Not sure what this does
    espDevice.deviceName = newDeviceName

    promise?.resolve(newDeviceName)
  }

  override fun getPrimaryServiceUuid(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevice.primaryServiceUuid)
  }

  @ReactMethod
  override fun setPrimaryServiceUuid(deviceName: String, primaryServiceUuid: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevice.primaryServiceUuid = primaryServiceUuid
    promise?.resolve(primaryServiceUuid)
  }

  @ReactMethod
  override fun getSecurityType(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevice.securityType.ordinal)
  }

  @ReactMethod
  override fun setSecurityType(deviceName: String, security: Double, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    val securityEnum = when (security.toInt()) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    espDevice.securityType = securityEnum

    promise?.resolve(securityEnum.ordinal)
  }

  @ReactMethod
  override fun getTransportType(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevice.transportType.toString())
  }

  @ReactMethod
  override fun getVersionInfo(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    val result = Arguments.createMap()

    if (espDevice.versionInfo !== null) {
      try {
        val protoVersion = JSONObject(espDevice.versionInfo).getJSONObject("prov")

        val prov = Arguments.createMap()
        if (protoVersion.has("sec_ver")) {
          prov.putInt("sec_ver", protoVersion.optInt("sec_ver"))
        }
        if (protoVersion.has("ver")) {
          prov.putString("ver", protoVersion.optString("ver"))
        }
        if (protoVersion.has("cap")) {
          val capabilities = Arguments.createArray()
          val cap = protoVersion.getJSONArray("cap")
          for (i in 0..<cap.length()) {
            capabilities.pushString(cap.getString(i))
          }
          prov.putArray("cap", capabilities)
        }

        result.putMap("prov", prov)
      } catch (e: JSONException) {
        // Ignore error
      }
    }

    promise?.resolve(result)
  }

  @ReactMethod
  override fun getDeviceCapabilities(deviceName: String, promise: Promise?) {
    val espDevice = espDevices[deviceName].guard {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    val capabilities = Arguments.createArray()

    if (espDevice.deviceCapabilities != null) {
      for (capability in espDevice.deviceCapabilities!!) {
        capabilities.pushString(capability)
      }
    }

    promise?.resolve(capabilities)
  }
}
