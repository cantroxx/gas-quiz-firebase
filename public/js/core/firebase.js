(function () {
  let firestoreDbInstance = null;
  let firebaseFunctionsInstance = null;
  let firebaseStorageInstance = null;

  function getFirestoreDb() {
    if(!window.firebase?.apps?.length || !window.firebase.firestore) return null;
    if(firestoreDbInstance) return firestoreDbInstance;

    firestoreDbInstance = window.firebase.firestore();
    try {
      firestoreDbInstance.settings({
        ignoreUndefinedProperties: true,
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false,
        merge: true
      });
    } catch(error) {
      console.warn('Firestore settings could not be applied after initialization.', error);
    }
    return firestoreDbInstance;
  }

  function getFirebaseStorage() {
    if(!window.firebase?.apps?.length || !window.firebase.storage) return null;
    if(firebaseStorageInstance) return firebaseStorageInstance;
    firebaseStorageInstance = window.firebase.storage();
    return firebaseStorageInstance;
  }

  function getFirebaseFunctions() {
    if(!window.firebase?.apps?.length || !window.firebase.functions) return null;
    if(firebaseFunctionsInstance) return firebaseFunctionsInstance;
    firebaseFunctionsInstance = window.firebase.app().functions('asia-northeast3');
    return firebaseFunctionsInstance;
  }

  function getFirebaseAuth() {
    if(!window.firebase?.apps?.length || !window.firebase.auth) return null;
    return window.firebase.auth();
  }

  function getFirestoreFieldValue() {
    return window.firebase.firestore.FieldValue;
  }

  window.DJ48Firebase = {
    getFirestoreDb,
    getFirebaseStorage,
    getFirebaseFunctions,
    getFirebaseAuth,
    getFirestoreFieldValue
  };
})();
