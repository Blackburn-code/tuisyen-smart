package com.blackburn.tuisyensmart;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TSNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
