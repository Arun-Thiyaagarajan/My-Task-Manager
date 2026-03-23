'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    
    // Check if we have a valid config to use as fallback first
    const hasConfig = firebaseConfig && firebaseConfig.apiKey;

    try {
      // Attempt auto-initialization first (for Firebase Hosting/App Hosting)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to local config object if auto-init fails
      if (hasConfig) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        // If no config is present at all, we must throw to notify the developer
        console.error('Firebase initialization failed: No configuration provided.');
        throw e;
      }
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
