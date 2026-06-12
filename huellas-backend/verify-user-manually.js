const admin = require('firebase-admin');
const path = require('path');

const credentialsPath = path.resolve(__dirname, './firebase/serviceAccount.json');
const serviceAccount = require(credentialsPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = process.argv[2];
if (!email) {
  console.log("Uso: node verify-user-manually.js <correo>");
  process.exit(1);
}

async function verify() {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, {
      emailVerified: true
    });
    console.log(`✅ El correo ${email} ha sido verificado exitosamente en Firebase Auth.`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ El usuario con correo ${email} no existe en Firebase Auth.`);
    } else {
      console.error("❌ Error al verificar el usuario:", error);
    }
  }
}

verify();
