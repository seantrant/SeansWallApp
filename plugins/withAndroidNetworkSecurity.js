const fs = require('node:fs/promises');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

function withAndroidNetworkSecurity(config) {
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const xmlDir = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      await fs.mkdir(xmlDir, { recursive: true });
      await fs.writeFile(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG, 'utf8');
      return modConfig;
    },
  ]);

  return withAndroidManifest(config, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];

    if (mainApplication) {
      mainApplication.$['android:usesCleartextTraffic'] = 'true';
      mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }

    return modConfig;
  });
}

module.exports = withAndroidNetworkSecurity;
