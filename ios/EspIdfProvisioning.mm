#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(EspIdfProvisioning, NSObject)

    RCT_EXTERN_METHOD(searchESPDevices:(NSString *)devicePrefix
                      transport:(NSString *)location
                      security:(NSString *)security
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(stopESPDevicesSearch)

    RCT_EXTERN_METHOD(createESPDevice:(NSString *)deviceName
                      transport:(NSString *)transport
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(connect:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(connectToSoftApUsingCredentials:(NSString *)ssid
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(verifyConnection:(NSString *)ssid)

    RCT_EXTERN_METHOD(sendData:(NSString *)path
                      transport:(NSString *)data
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(isSessionEstablished)

    RCT_EXTERN_METHOD(getProofOfPossesion:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getUsername:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(scanWifiList:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(disconnect)

    RCT_EXTERN_METHOD(provision:(NSString *)ssid
                      passphrase:(NSString *)passphrase
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)


    // Don't compile this code when we build for the old architecture.
    #ifdef RCT_NEW_ARCH_ENABLED
    - (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
        (const facebook::react::ObjCTurboModule::InitParams &)params
    {
        return std::make_shared<facebook::react::NativeEspIdfProvisioningSpecJSI>(params);
    }
    #endif

@end
