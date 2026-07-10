import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.servingsync.pos',
  appName: 'ServingSync POS',
  webDir: 'out',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;