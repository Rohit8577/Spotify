/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  // EAS supports a file environment variable; local/CI builds can supply the same file.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || './.firebase/google-services.json';
  const available = fs.existsSync(path.resolve(__dirname, googleServicesFile));
  if (available) {
    const firebase = JSON.parse(fs.readFileSync(path.resolve(__dirname, googleServicesFile), 'utf8').replace(/^\uFEFF/, ''));
    if (!firebase.client?.some((client) => client.client_info?.android_client_info?.package_name === config.android.package)) {
      throw new Error('Firebase Android configuration does not match the app package.');
    }
  }
  return {
    ...config,
    android: { ...config.android, ...(available ? { googleServicesFile } : {}) },
    extra: { ...config.extra, pushNotificationsConfigured: available },
  };
};
