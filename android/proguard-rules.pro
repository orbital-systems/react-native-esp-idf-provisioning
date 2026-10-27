-dontwarn com.espressif.provisioning.**
-dontwarn espressif.**
-keep class com.espressif.provisioning.** {*;}
-keepclassmembers class com.espressif.provisioning.** {*;}
-keep class espressif.** {*;}
-keepclassmembers class espressif.** {*;}
-keep interface com.espressif.provisioning.** {*;}
-keep interface espressif.** {*;}
-keep public enum com.espressif.provisioning.** {*;}
-keep public enum espressif.** {*;}

# QR scanning dependencies excluded in build.gradle, only referenced by ESPProvisionManager.scanQRCode
-dontwarn androidx.camera.**
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.vision.**
-dontwarn com.budiyev.android.codescanner.**
-dontwarn com.google.zxing.**
