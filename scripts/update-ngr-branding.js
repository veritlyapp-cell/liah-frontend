
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateNGRBranding() {
  const holdingRef = db.collection('holdings').doc('ngr');
  await holdingRef.update({
    "config.branding.enabled": true,
    "config.branding.primaryColor": "#FF6B35",
    "config.branding.secondaryColor": "#0A0A0A",
    "config.branding.showCompanyInfo": true
  });
  console.log('NGR Branding updated to Orange/Black.');
}

updateNGRBranding();
