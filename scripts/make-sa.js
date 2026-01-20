const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const sa = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "botwhatsapp-5dac9",
    private_key_id: "dummy",
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: "dummy",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
};

fs.writeFileSync('scripts/tmp-sa.json', JSON.stringify(sa, null, 2));
console.log('✅ Generated scripts/tmp-sa.json');
