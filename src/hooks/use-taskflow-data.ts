
'use client';

import React, { useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { 
    collection, 
    onSnapshot, 
    doc, 
    query, 
    orderBy,
    setDoc,
    getDoc,
    where,
    limit
} from 'firebase/firestore';
import { 
    getAppData, 
    setCloudCache, 
    getActiveCompanyId,
    getAuthMode,
    updateUserPreferences,
    markInitialSyncComplete,
    getUserPreferences,
    markNotificationRead
} from '@/lib/data';
import type { Task, Note, Log, Company, MyTaskManagerData, CompanyData, UserPreferences, AppNotification } from '@/lib/types';
import { INITIAL_RELEASES, INITIAL_UI_CONFIG, TASK_STATUSES, INITIAL_REPOSITORY_CONFIGS, ENVIRONMENTS } from '@/lib/constants';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';

/**
 * Hook to manage real-time data synchronization between Firestore and the application cache.
 * Only active in 'authenticate' mode.
 */
export function useTaskFlowData() {
    const { user, firestore, userProfile } = useFirebase();
    const activeCompanyId = getActiveCompanyId();
    const pathname = usePathname();
    const { toast } = useToast();
    const router = useRouter();
    
    const unsubscribers = useRef<(() => void)[]>([]);
    const processedIds = useRef<Set<string>>(new Set());
    const pathnameRef = useRef(pathname);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Ensure logic uses current pathname without restarting listener
    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    // Pre-initialize notification sound
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audioRef.current.volume = 0.35;
    }, []);

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

            // 1. GLOBAL NOTIFICATIONS LISTENER (Unified Singleton)
            const isAdmin = userProfile?.role === 'admin';
            const notifRef = collection(db, 'notifications');
            const recipientIds = [userId];
            if (isAdmin) recipientIds.push('admin');

            const qNotif = query(
                notifRef,
                where('recipientId', 'in', recipientIds),
                limit(50)
            );

            let isFirstSnapshot = true;

            const unsubNotif = onSnapshot(qNotif, (snapshot) => {
                const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AppNotification));
                
                // Update Global Cache
                const currentAppData = getAppData();
                currentAppData.notifications = items;
                setCloudCache(currentAppData);
                window.dispatchEvent(new Event('company-changed'));

                // Notification Alert Trigger Logic
                if (!isFirstSnapshot) {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const newNotif = change.doc.data() as AppNotification;
                            
                            // FIX: Prevent Duplicate Processing
                            if (processedIds.current.has(change.doc.id)) return;
                            processedIds.current.add(change.doc.id);

                            // FIX: Filter out self-actions
                            if (newNotif.senderId === userId) return;

                            // FIX: Filter out if already on the linked page
                            if (pathnameRef.current === newNotif.link) return;

                            // FIX: Conditional Alert (Sound + Toast)
                            const prefs = getUserPreferences();
                            if (prefs.notificationSounds !== false && audioRef.current) {
                                audioRef.current.currentTime = 0;
                                audioRef.current.play().catch(() => {});
                            }

                            toast({
                                title: newNotif.title,
                                description: newNotif.message,
                                action: React.createElement(Button, {
                                    size: 'sm',
                                    variant: 'outline',
                                    onClick: () => {
                                        markNotificationRead(change.doc.id);
                                        router.push(newNotif.link);
                                    }
                                }, 'View')
                            });
                        }
                    });
                }
                isFirstSnapshot = false;
            }, (error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: notifRef.path,
                    operation: 'list',
                }));
            });
            unsubscribers.current.push(unsubNotif);

            // 2. Companies Metadata Listener
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

            // 3. Active Company Sub-resource Listeners
            if (activeCompanyId) {
                const companyBase = `users/${userId}/companies/${activeCompanyId}`;

                // Tasks Listener
                const tasksRef = collection(db, companyBase, 'tasks');
                const unsubTasks = onSnapshot(tasksRef, (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'tasks', snap.docs.map(d => d.data() as Task));
                    // Mark sync as complete once we get the initial tasks snapshot
                    markInitialSyncComplete(activeCompanyId);
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
    }, [user, firestore, activeCompanyId, userProfile?.role]); // Added role to re-listen correctly if admin mode changes
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
