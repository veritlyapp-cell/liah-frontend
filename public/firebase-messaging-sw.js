importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuración de producción para LIAH
firebase.initializeApp({
    apiKey: "AIzaSyAH8UdYN5pNFpCBdtLHQHaBe85agN0i_yo",
    authDomain: "botwhatsapp-5dac9.firebaseapp.com",
    projectId: "botwhatsapp-5dac9",
    storageBucket: "botwhatsapp-5dac9.firebasestorage.app",
    messagingSenderId: "983196968678",
    appId: "1:983196968678:web:6cf2002246108b1f887d27"
});

const messaging = firebase.messaging();

// Manejo de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Mensaje recibido en segundo plano:', payload);

    const notificationTitle = payload.notification?.title || 'LIAH';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva actualización',
        icon: '/liah-icon.png',
        badge: '/icons/icon-72x72.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
