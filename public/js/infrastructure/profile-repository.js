(function (root) {
  function buildRankingMessageUpdate(message, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      rankingMessage: root.DJ48AccountDomain.normalizeRankingMessageInput(message),
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  async function saveUserProfileUpdate(options = {}) {
    const { db, memberUserId, updateData } = options;
    if(!memberUserId) throw new Error('member-required');
    if(!db) throw new Error('firestore-unavailable');
    await db.collection('users').doc(memberUserId).set(updateData, { merge: true });
    return updateData;
  }

  async function searchProfileImageCandidates(options = {}) {
    const { db, query = '', limit = 24 } = options;
    if(!db) throw new Error('firestore-unavailable');
    const snapshot = await db.collection('profileImageCandidates')
      .where('keywords', 'array-contains', query)
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ candidateId: doc.id, ...doc.data() }));
  }

  function getProfileImageFileExtension(file) {
    const type = String(file?.type || '').toLowerCase();
    if(type.includes('png')) return 'png';
    if(type.includes('webp')) return 'webp';
    return 'jpg';
  }

  function buildProfileImageStoragePath(options = {}, deps = {}) {
    const authUid = options.authUid || '';
    const memberUserId = options.memberUserId || '';
    const extension = options.extension || 'jpg';
    const now = deps.now || Date.now;
    if(!authUid) throw new Error('login-required');
    if(!memberUserId) throw new Error('member-required');
    return `profileImages/${authUid}/${memberUserId}_${now()}.${extension}`;
  }

  function buildProfileImageUpdate(editorState = {}, edit = {}, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      profileImageUrl: editorState.profileImageUrl || editorState.imageUrl || '',
      profileImageSource: editorState.profileImageSource || editorState.source || '',
      profileImageStoragePath: editorState.profileImageStoragePath || '',
      profileImageScale: edit.profileImageScale,
      profileImageOffsetX: edit.profileImageOffsetX,
      profileImageOffsetY: edit.profileImageOffsetY,
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  function buildUploadedProfileImageUpdate(editorState = {}, uploadResult = {}, edit = {}, deps = {}) {
    return buildProfileImageUpdate({
      profileImageUrl: uploadResult.downloadUrl || editorState.profileImageUrl || editorState.imageUrl || '',
      profileImageSource: editorState.profileImageSource || editorState.source || '',
      profileImageStoragePath: uploadResult.path || editorState.profileImageStoragePath || ''
    }, edit, deps);
  }

  async function uploadProfileImageToStorage(options = {}, deps = {}) {
    const {
      storage,
      authUid,
      memberUserId,
      file
    } = options;
    if(!storage) throw new Error('storage-unavailable');

    const extension = getProfileImageFileExtension(file);
    const path = buildProfileImageStoragePath({
      authUid,
      memberUserId,
      extension
    }, deps);
    const ref = storage.ref(path);
    await ref.put(file, {
      contentType: file.type,
      customMetadata: {
        memberUserId,
        source: 'profile-upload'
      }
    });
    const downloadUrl = await ref.getDownloadURL();
    return { downloadUrl, path };
  }

  async function saveProfileImageEditorSelection(options = {}, deps = {}) {
    const {
      db,
      memberUserId,
      editorState,
      edit,
      storage,
      authUid,
      currentProfile
    } = options;
    if(!memberUserId) throw new Error('member-required');
    if(!editorState) return null;
    if(!db) throw new Error('firestore-unavailable');

    let uploadResult = null;
    if(editorState.source === 'upload') {
      uploadResult = await uploadProfileImageToStorage({
        storage,
        authUid,
        memberUserId,
        file: editorState.file
      }, deps);
    }
    const updateData = buildUploadedProfileImageUpdate(editorState, uploadResult || {}, edit, deps);
    await saveUserProfileUpdate({
      db,
      memberUserId,
      updateData
    });
    return {
      updateData,
      nextProfile: {
        ...(currentProfile || {}),
        ...updateData
      }
    };
  }

  function saveRankingMessageForMember(options = {}, deps = {}) {
    return saveUserProfileUpdate({
      db: options.db,
      memberUserId: options.memberUserId,
      updateData: buildRankingMessageUpdate(options.message, deps)
    });
  }

  function buildSelectedTitleUpdate(titleId, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      selectedTitleId: String(titleId || '').trim(),
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  async function saveSelectedTitleForMember(options = {}, deps = {}) {
    const selectedTitleId = String(options.titleId || '').trim();
    if(!options.memberUserId) throw new Error('member-required');
    if(!options.db) throw new Error('firestore-unavailable');
    if(selectedTitleId) {
      const titleSnapshot = await options.db
        .collection('userTitles')
        .doc(options.memberUserId)
        .collection('titles')
        .doc(selectedTitleId)
        .get();
      if(!titleSnapshot.exists) throw new Error('title-not-owned');
    }
    return saveUserProfileUpdate({
      db: options.db,
      memberUserId: options.memberUserId,
      updateData: buildSelectedTitleUpdate(selectedTitleId, deps)
    });
  }

  function createProfileRepository(deps = {}) {
    const firestoreDeps = {
      getFirestoreFieldValue: deps.getFirestoreFieldValue
    };
    return {
      searchProfileImageCandidates,
      saveProfileImageEditorSelection: options => saveProfileImageEditorSelection(options, firestoreDeps),
      saveRankingMessageForMember: options => saveRankingMessageForMember(options, firestoreDeps),
      saveSelectedTitleForMember: options => saveSelectedTitleForMember(options, firestoreDeps)
    };
  }

  const api = {
    createProfileRepository
  };

  root.DJ48ProfileRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
