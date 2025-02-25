# scripts/encrypt-config.js
const ConfigLoader = require('../src/lib/ConfigLoader');

async function encryptConfig() {
    const loader = new ConfigLoader();
    await loader.encryptConfigPasswords();
    console.log('Configuration passwords encrypted');
}

encryptConfig().catch(console.error);