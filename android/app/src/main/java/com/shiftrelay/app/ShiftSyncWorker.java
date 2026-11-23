package com.shiftrelay.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * Background WorkManager worker scheduled with NetworkType.CONNECTED constraints.
 * Records last validated connectivity timestamp so the WebView offline queue
 * immediately flushes any buffered handovers/clock-ins upon foreground/resume.
 */
public class ShiftSyncWorker extends Worker {

    public static final String PREFS_NAME = "shiftrelay_native_prefs";
    public static final String KEY_LAST_SYNC_READY_MS = "last_sync_ready_ms";

    public ShiftSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) {
            return Result.retry();
        }
        Network active = cm.getActiveNetwork();
        NetworkCapabilities caps = active != null ? cm.getNetworkCapabilities(active) : null;
        boolean hasInternet = caps != null
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);

        if (!hasInternet) {
            return Result.retry();
        }

        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putLong(KEY_LAST_SYNC_READY_MS, System.currentTimeMillis()).apply();
        return Result.success();
    }
}
