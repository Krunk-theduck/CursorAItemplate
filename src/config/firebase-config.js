// Import the functions you need from the SDKs you need
const firebaseConfig = {
    apiKey: "AIzaSyAT8lAk-MzVwnSdSyu8dZhCuuNUDkhaq0o",
    authDomain: "car-collectors-49072.firebaseapp.com",
    projectId: "car-collectors-49072",
    storageBucket: "car-collectors-49072.firebasestorage.app",
    messagingSenderId: "94851011167",
    appId: "1:94851011167:web:3866a680a9d5046fe7c1ea",
    measurementId: "G-B3WRJXQQ0G",
    databaseURL: "https://car-collectors-49072-default-rtdb.firebaseio.com/"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();

// Export if needed
window.db = db;
window.auth = auth;
window.rtdb = rtdb; 