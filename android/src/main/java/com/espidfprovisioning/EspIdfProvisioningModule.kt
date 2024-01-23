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
import java.lang.Exception
import java.util.ArrayList
import java.util.Base64

fun BluetoothDevice.isAlreadyConnected(): Boolean {
  return try {
    javaClass.getMethod("isConnected").invoke(this) as? Boolean? ?: false
  } catch (e: Throwable) {
    false
  }
}

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
      if (
        ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
      ) {
        return true
      } else {
        return false
      }
    }
    else if (
      ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
      ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    ) {
      return true
    }
    return false
  }

  private fun hasWifiPermission(): Boolean {
    if (
      ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.CHANGE_WIFI_STATE) == PackageManager.PERMISSION_GRANTED &&
      ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_WIFI_STATE) == PackageManager.PERMISSION_GRANTED &&
      ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_NETWORK_STATE) == PackageManager.PERMISSION_GRANTED
    ) {
      return true
    }
    return false
  }

  private fun hasFineLocationPermission(): Boolean {
    return ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun searchESPDevices(devicePrefix: String, transport: String, security: Int, promise: Promise?) {
    // Permission checks
    if (
      hasBluetoothPermissions() == false ||
      hasFineLocationPermission() == false
    ) {
      promise?.reject(Error("Missing one of the following permissions: BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, BLUETOOTH_SCAN, ACCESS_FINE_LOCATION"))
      return
    }

    val transportEnum = when (transport) {
      "softap" -> ESPConstants.TransportType.TRANSPORT_SOFTAP
      "ble" -> ESPConstants.TransportType.TRANSPORT_BLE
      else -> ESPConstants.TransportType.TRANSPORT_BLE
    }
    val securityEnum = when (security) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    espDevices.clear()

    val invoked = false
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

        var serviceUuid: String? = null
        if (scanResult.scanRecord?.serviceUuids != null && scanResult.scanRecord?.serviceUuids?.size!! > 0) {
          serviceUuid = scanResult.scanRecord?.serviceUuids?.get(0).toString()
        }

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
          resultMap.putArray("capabilities", Arguments.fromList(espDevice.deviceCapabilities))
          resultMap.putInt("security", security)
          resultMap.putString("transport", transport)
          resultMap.putString("username", espDevice.userName)
          resultMap.putString("versionInfo", espDevice.versionInfo)
          resultMap.putString("address", espDevice.bluetoothDevice.address)
          resultMap.putString("primaryServiceUuid", espDevice.primaryServiceUuid)

          resultArray.pushMap(resultMap)
        }

        promise?.resolve(resultArray)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun stopESPDevicesSearch() {
    // Permission checks
    if (
      hasBluetoothPermissions() == false ||
      hasFineLocationPermission() == false
    ) {
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
    security: Int,
    proofOfPossession: String?,
    softAPPassword: String?,
    username: String?,
    promise: Promise?
  ) {
    // Permission checks
    if (hasBluetoothPermissions() == false) {
      promise?.reject(Error("Missing one of the following permissions: BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, BLUETOOTH_SCAN"))
      return
    }

    val transportEnum = when (transport) {
      "softap" -> ESPConstants.TransportType.TRANSPORT_SOFTAP
      "ble" -> ESPConstants.TransportType.TRANSPORT_BLE
      else -> ESPConstants.TransportType.TRANSPORT_BLE
    }
    val securityEnum = when (security) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    // If no ESP device found in list (no scan has been performed), create a new one
    val espDevice: ESPDevice;
    if (espDevices[deviceName] != null) {
      espDevice = espDevices[deviceName]!!
    } else {
      espDevice = espProvisionManager.createESPDevice(transportEnum, securityEnum)
      espDevice.deviceName = deviceName
      espDevices[deviceName] = espDevice
    }
    // bluetoothDevice, deviceName and primaryServiceUuid were filled at onPeripheralFound
    // If the bluetooth device does not contain service uuids, try using the bonded
    // one (if it exists)
    if (espDevice.bluetoothDevice == null) {
      espDevice.bluetoothDevice = bluetoothAdapter.bondedDevices.find {
          bondedDevice -> bondedDevice.name == deviceName
      }
    }

    // If the bluetooth device exists and contains service uuids, we will be able to connect to it
    if (espDevice.bluetoothDevice != null) {
      espDevice.proofOfPossession = proofOfPossession
      if (username != null) {
        espDevice.userName = username
      }

      val result = Arguments.createMap()
      result.putString("name", espDevice.deviceName)
      result.putArray("capabilities", Arguments.fromList(espDevice.deviceCapabilities))
      result.putInt("security", security)
      result.putString("transport", transport)
      result.putString("username", espDevice.userName)
      result.putString("versionInfo", espDevice.versionInfo)

      promise?.resolve(result)
      return
    }

    // Exhausted our other options, perform search in hope of finding the device
    searchESPDevices(deviceName, transport, security, object : Promise {
      override fun resolve(p0: Any?) {
        // If search does not find the device, consider it not found
        if (espDevices[deviceName] == null) {
          promise?.reject(Error("Device not found."))
        }

        // Configure proof of possession
        espDevices[deviceName]?.proofOfPossession = proofOfPossession
        if (username != null) {
          espDevices[deviceName]?.userName = username
        }

        val result = Arguments.createMap()
        result.putString("name", espDevices[deviceName]?.deviceName)
        result.putArray("capabilities", Arguments.fromList(espDevices[deviceName]?.deviceCapabilities))
        result.putInt("security", security)
        result.putString("transport", transport)
        result.putString("username", espDevices[deviceName]?.userName)
        result.putString("versionInfo", espDevices[deviceName]?.versionInfo)

        promise?.resolve(result)
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

      @Deprecated("Deprecated in Java", ReplaceWith("promise?.reject(p0)"))
      override fun reject(p0: String?) {
        promise?.reject(p0)
      }
    })
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun connect(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    if (espDevices[deviceName]?.transportType == ESPConstants.TransportType.TRANSPORT_SOFTAP) {
      // Permission checks
      if (
        hasWifiPermission() == false ||
        hasFineLocationPermission() == false
      ) {
        promise?.reject(Error("Missing one of the following permissions: CHANGE_WIFI_STATE, ACCESS_WIFI_STATE, ACCESS_NETWORK_STATE, ACCESS_FINE_LOCATION"))
        return
      }
    }

    if (espDevices[deviceName]?.transportType == ESPConstants.TransportType.TRANSPORT_BLE && espDevices[deviceName]?.bluetoothDevice?.isAlreadyConnected() == true) {
      val result = Arguments.createMap()
      result.putString("status", "connected")
      promise?.resolve(result)
      return
    }

    espDevices[deviceName]?.connectToDevice()

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
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    val decodedData = Base64.getDecoder().decode(data)
    espDevices[deviceName]?.sendDataToCustomEndPoint(path, decodedData, object : ResponseListener {
      override fun onSuccess(returnData: ByteArray?) {
        val encodedData = Base64.getEncoder().encode(returnData).toString(Charsets.UTF_8)
        promise?.resolve(encodedData)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  @ReactMethod
  override fun getProofOfPossession(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevices[deviceName]?.proofOfPossession)
  }

  @ReactMethod
  override fun scanWifiList(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]?.scanNetworks(object : WiFiScanListener {
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
        promise?.reject(e)
      }
    })
  }

  @ReactMethod
  override fun disconnect(deviceName: String) {
    espDevices[deviceName]?.disconnectDevice()
  }

  @ReactMethod
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
        val result = Arguments.createMap()
        result.putString("status", "success")
        promise?.resolve(result)
      }

      override fun onProvisioningFailed(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  @ReactMethod
  override fun initializeSession(deviceName: String, sessionPath: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]?.initSession(object : ResponseListener {
      override fun onSuccess(returnData: ByteArray?) {
        val encodedData = Base64.getEncoder().encode(returnData)
        promise?.resolve(encodedData)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }
}
