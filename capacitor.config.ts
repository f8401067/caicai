import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.caicai.lottery',
  appName: '菜菜彩票',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
