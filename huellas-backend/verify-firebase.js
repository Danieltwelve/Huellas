const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const credentialsPath = path.resolve(__dirname, './firebase/serviceAccount.json');
console.log('Checking credentials file at:', credentialsPath);

if (!fs.existsSync(credentialsPath)) {
  console.error('ERROR: serviceAccount.json does not exist at that path!');
  process.exit(1);
}

try {
  const serviceAccount = require(credentialsPath);
  console.log('Successfully loaded JSON file.');
  console.log('Project ID in credentials:', serviceAccount.project_id);
  console.log('Client Email in credentials:', serviceAccount.client_email);

  // Initialize Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK initialized successfully!');

  const auth = admin.auth();

  async function checkUser(email) {
    try {
      console.log(`Searching for user ${email} in Firebase Auth...`);
      const userRecord = await auth.getUserByEmail(email);
      console.log('User found in Firebase:');
      console.log('- UID:', userRecord.uid);
      console.log('- Email:', userRecord.email);
      console.log('- Email Verified:', userRecord.emailVerified);
      console.log('- Providers:', userRecord.providerData.map(p => p.providerId));
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`User ${email} was NOT found in Firebase Auth.`);
      } else {
        console.error('Error fetching user from Firebase:', error);
      }
    }
  }

  checkUser('zulyr980@gmail.com');

} catch (error) {
  console.error('Failed to initialize or run diagnostic:', error);
}
