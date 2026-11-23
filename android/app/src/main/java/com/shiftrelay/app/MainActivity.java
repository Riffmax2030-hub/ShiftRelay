package com.shiftrelay.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ShiftRelayNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
