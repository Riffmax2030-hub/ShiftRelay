package com.shiftrelay.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "ShiftRelayNative")
public class ShiftRelayNativePlugin extends Plugin {

    private static final String SYNC_UNIQUE_ONCE = "shiftrelay_offline_flush_once";
    private static final String SYNC_UNIQUE_PERIODIC = "shiftrelay_offline_flush_periodic";

    @PluginMethod
    public void getNetworkSnapshot(PluginCall call) {
        Context ctx = getContext();
        ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        JSObject ret = new JSObject();
        if (cm == null) {
            ret.put("connected", false);
            ret.put("validated", false);
            ret.put("metered", true);
            ret.put("transport", "unknown");
            call.resolve(ret);
            return;
        }

        Network active = cm.getActiveNetwork();
        NetworkCapabilities caps = active != null ? cm.getNetworkCapabilities(active) : null;
        boolean connected = caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        boolean validated = caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        boolean unmetered = caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED);

        String transport = "none";
        if (caps != null) {
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) transport = "wifi";
            else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) transport = "cellular";
            else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) transport = "ethernet";
            else if (connected) transport = "other";
        }

        SharedPreferences prefs = ctx.getSharedPreferences(ShiftSyncWorker.PREFS_NAME, Context.MODE_PRIVATE);
        ret.put("connected", connected);
        ret.put("validated", validated);
        ret.put("metered", !unmetered);
        ret.put("transport", transport);
        ret.put("lastSyncReadyMs", prefs.getLong(ShiftSyncWorker.KEY_LAST_SYNC_READY_MS, 0L));
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleBackgroundSync(PluginCall call) {
        Context ctx = getContext();
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        OneTimeWorkRequest oneTime = new OneTimeWorkRequest.Builder(ShiftSyncWorker.class)
                .setConstraints(constraints)
                .build();

        PeriodicWorkRequest periodic = new PeriodicWorkRequest.Builder(ShiftSyncWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build();

        WorkManager wm = WorkManager.getInstance(ctx);
        wm.enqueueUniqueWork(SYNC_UNIQUE_ONCE, ExistingWorkPolicy.REPLACE, oneTime);
        wm.enqueueUniquePeriodicWork(SYNC_UNIQUE_PERIODIC, ExistingPeriodicWorkPolicy.KEEP, periodic);

        JSObject ret = new JSObject();
        ret.put("scheduled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void shareFileNative(PluginCall call) {
        String rawFilename = call.getString("filename", "ShiftRelay-Document.pdf");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String base64Data = call.getString("base64Data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Missing base64Data");
            return;
        }

        String safeName = new File(rawFilename).getName().replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safeName.isEmpty()) safeName = "ShiftRelay-Document.bin";

        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            File exportDir = new File(getContext().getCacheDir(), "exports");
            if (!exportDir.exists()) exportDir.mkdirs();
            File outFile = new File(exportDir, safeName);
            try (FileOutputStream fos = new FileOutputStream(outFile)) {
                fos.write(bytes);
            }

            String authority = getContext().getPackageName() + ".fileprovider";
            Uri contentUri = FileProvider.getUriForFile(getContext(), authority, outFile);

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, safeName);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(shareIntent, "Share " + safeName);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("shared", true);
            ret.put("filename", safeName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to share file: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void setSecurePref(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value", "");
        if (key == null || key.isEmpty()) {
            call.reject("Missing key");
            return;
        }
        SharedPreferences prefs = getContext().getSharedPreferences(ShiftSyncWorker.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(key, value).apply();
        JSObject ret = new JSObject();
        ret.put("saved", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getSecurePref(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("Missing key");
            return;
        }
        SharedPreferences prefs = getContext().getSharedPreferences(ShiftSyncWorker.PREFS_NAME, Context.MODE_PRIVATE);
        JSObject ret = new JSObject();
        ret.put("value", prefs.getString(key, null));
        call.resolve(ret);
    }
}
