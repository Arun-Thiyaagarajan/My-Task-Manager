
'use client';

import { useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { 
    collection, 
    onSnapshot, 
    doc, 
    query, 
    orderBy,
    setDoc,
    getDoc
} from 'firebase/firestore';
import { 
    getAppData, 
    setCloudCache, 
    getActiveCompanyId,
    getAuthMode,
    updateUserPreferences
} from '@/lib/data';
import type { Task, Note, Log, Company, MyTaskManagerData, CompanyData, UserPreferences } from '@/lib/types';
import { INITIAL_RELEASES, INITIAL_UI_CONFIG, TASK_STATUSES, INITIAL_REPOSITORY_CONFIGS, ENVIRONMENTS } from '@/lib/constants';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook to manage real-time data synchronization between Firestore and the application cache.
 * Only active in 'authenticate' mode.
 */
export function useTaskFlowData() {
    const { user, firestore } = useFirebase();
    const activeCompanyId = getActiveCompanyId();
    const unsubscribers = useRef<(() => void)[]>([]);

    useEffect(() => {
        const authMode = getAuthMode();
        if (authMode !== 'authenticate' || !user || !firestore) {
            // Clear cloud cache and stop listeners if not in sync mode
            unsubscribers.current.forEach(unsub => unsub());
            unsubscribers.current = [];
            setCloudCache(null);
            return;
        }

        const userId = user.uid;
        const db = firestore;

        const setupListeners = () => {
            // Cleanup existing listeners before re-establishing
            unsubscribers.current.forEach(unsub => unsub());
            unsubscribers.current = [];

            // 0. User Preferences Fetch (Initial only, then local-first write-back)
            const prefRef = doc(db, 'users', userId, 'preferences', 'settings');
            getDoc(prefRef).then(snap => {
                if (snap.exists()) {
                    updateUserPreferences(snap.data() as UserPreferences);
                }
            }).catch(e => {
                // Ignore initial pref fetch error
            });

            // 1. Companies Metadata Listener
            const companiesRef = collection(db, 'users', userId, 'companies');
            const unsubCompanies = onSnapshot(companiesRef, (snapshot) => {
                const companies: Company[] = snapshot.docs.map(d => d.data() as Company);
                
                if (companies.length === 0) {
                    // Bootstrap default company if none exists in cloud for this user
                    const defaultId = 'company-default';
                    const defaultCompany = { id: defaultId, name: 'My Cloud Workspace' };
                    const docRef = doc(db, 'users', userId, 'companies', defaultId);
                    
                    setDoc(docRef, defaultCompany).catch(e => {
                        errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: docRef.path,
                            operation: 'create',
                            requestResourceData: defaultCompany
                        }));
                    });
                    return;
                }

                const currentData = getAppData();
                const updatedData: MyTaskManagerData = {
                    ...currentData,
                    companies,
                    activeCompanyId: companies.some(c => c.id === activeCompanyId) ? activeCompanyId : companies[0].id
                };

                // Initialize data containers for new companies
                companies.forEach(company => {
                    if (!updatedData.companyData[company.id]) {
                        updatedData.companyData[company.id] = _getEmptyCompanyData();
                    }
                });

                setCloudCache(updatedData);
                window.dispatchEvent(new Event('company-changed'));
            }, (error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: companiesRef.path,
                    operation: 'list',
                }));
            });
            unsubscribers.current.push(unsubCompanies);

            // 2. Active Company Sub-resource Listeners
            if (activeCompanyId) {
                const companyBase = `users/${userId}/companies/${activeCompanyId}`;

                // Tasks Listener
                const tasksRef = collection(db, companyBase, 'tasks');
                const unsubTasks = onSnapshot(tasksRef, (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'tasks', snap.docs.map(d => d.data() as Task));
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: tasksRef.path,
                        operation: 'list',
                    }));
                });
                unsubscribers.current.push(unsubTasks);

                // Notes Listener
                const notesRef = collection(db, companyBase, 'notes');
                const unsubNotes = onSnapshot(notesRef, (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'notes', snap.docs.map(d => d.data() as Note));
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: notesRef.path,
                        operation: 'list',
                    }));
                });
                unsubscribers.current.push(unsubNotes);

                // Logs Listener
                const logsQuery = query(collection(db, companyBase, 'logs'), orderBy('timestamp', 'desc'));
                const unsubLogs = onSnapshot(logsQuery, (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'logs', snap.docs.map(d => d.data() as Log));
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: `${companyBase}/logs`,
                        operation: 'list',
                    }));
                });
                unsubscribers.current.push(unsubLogs);

                // UI Config Listener
                const configRef = doc(db, companyBase, 'settings', 'uiConfig');
                const unsubConfig = onSnapshot(configRef, (snap) => {
                    if (snap.exists()) {
                        _updateCloudCachePart(activeCompanyId, 'uiConfig', snap.data());
                    }
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: configRef.path,
                        operation: 'get',
                    }));
                });
                unsubscribers.current.push(unsubConfig);

                // People Listeners (Developers & Testers)
                const devsRef = doc(db, companyBase, 'people', 'developers');
                const unsubDevs = onSnapshot(devsRef, (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'developers', snap.data().list || []);
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: devsRef.path,
                        operation: 'get',
                    }));
                });
                unsubscribers.current.push(unsubDevs);

                const testersRef = doc(db, companyBase, 'people', 'testers');
                const unsubTesters = onSnapshot(testersRef, (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'testers', snap.data().list || []);
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: testersRef.path,
                        operation: 'get',
                    }));
                });
                unsubscribers.current.push(unsubTesters);

                // General Reminders Listener
                const remindersRef = doc(db, companyBase, 'reminders', 'general');
                const unsubReminders = onSnapshot(remindersRef, (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'generalReminders', snap.data().list || []);
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: remindersRef.path,
                        operation: 'get',
                    }));
                });
                unsubscribers.current.push(unsubReminders);

                // Release Updates Listener
                const releasesRef = doc(db, companyBase, 'releases', 'updates');
                const unsubReleases = onSnapshot(releasesRef, (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'releaseUpdates', snap.data().list || []);
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: releasesRef.path,
                        operation: 'get',
                    }));
                });
                unsubscribers.current.push(unsubReleases);
            }
        };

        setupListeners();

        return () => {
            unsubscribers.current.forEach(unsub => unsub());
        };
    }, [user, firestore, activeCompanyId]);
}

function _updateCloudCachePart(companyId: string, part: keyof CompanyData, data: any) {
    const current = getAppData();
    if (!current.companyData[companyId]) {
        current.companyData[companyId] = _getEmptyCompanyData();
    }

    // Separate tasks into active and trash based on deletedAt presence
    if (part === 'tasks') {
        const allTasks = data as Task[];
        current.companyData[companyId].tasks = allTasks.filter(t => !t.deletedAt);
        current.companyData[companyId].trash = allTasks.filter(t => !!t.deletedAt);
    } else {
        (current.companyData[companyId] as any)[part] = data;
    }

    setCloudCache(current);
    window.dispatchEvent(new Event('company-changed'));
}

function _getEmptyCompanyData(): CompanyData {
    return {
        tasks: [],
        trash: [],
        developers: [],
        testers: [],
        notes: [],
        uiConfig: {
            fields: INITIAL_UI_CONFIG,
            environments: [...ENVIRONMENTS],
            repositoryConfigs: INITIAL_REPOSITORY_CONFIGS,
            taskStatuses: [...TASK_STATUSES],
            appName: 'New Cloud Company',
            appIcon: null,
            remindersEnabled: true,
            tutorialEnabled: true,
            timeFormat: '12h',
            autoBackupFrequency: 'weekly',
            autoBackupTime: 6,
            currentVersion: '1.1.0',
            authenticationMode: 'authenticate',
        },
        logs: [],
        generalReminders: [],
        releaseUpdates: [...INITIAL_RELEASES],
    };
}
