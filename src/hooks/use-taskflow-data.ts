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
    markNotificationRead,
    purgeExpiredNotifications
} from '@/lib/data';
import type { Task, Note, Log, Company, MyTaskManagerData, CompanyData, UserPreferences, AppNotification, UserProfile } from '@/lib/types';
import { INITIAL_RELEASES, INITIAL_UI_CONFIG, TASK_STATUSES, INITIAL_REPOSITORY_CONFIGS, ENVIRONMENTS } from '@/lib/constants';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';
import { Rocket, MessageSquare, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function useTaskFlowData() {
    const { user, firestore, userProfile, isUserLoading } = useFirebase();
    const activeCompanyId = getActiveCompanyId();
    const pathname = usePathname();
    const { toast } = useToast();
    const router = useRouter();
    
    const unsubscribers = useRef<(() => void)[]>([]);
    const processedIds = useRef<Set<string>>(new Set());
    const pathnameRef = useRef(pathname);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioUnlocked = useRef(false);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
        if (!activeCompanyId || isUserLoading) return;

        const checkPendingNavigation = () => {
            const pendingLink = localStorage.getItem('taskflow_pending_push_link');
            if (pendingLink) {
                localStorage.removeItem('taskflow_pending_push_link');
                setTimeout(() => {
                    window.dispatchEvent(new Event('navigation-start'));
                    router.push(pendingLink);
                }, 100);
            }
        };

        checkPendingNavigation();
    }, [activeCompanyId, router, isUserLoading]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audioRef.current.volume = 0.35;
            audioRef.current.preload = 'auto';
        }

        const unlockAudio = () => {
            if (audioRef.current && !audioUnlocked.current) {
                audioRef.current.play()
                    .then(() => {
                        audioRef.current?.pause();
                        if (audioRef.current) audioRef.current.currentTime = 0;
                        audioUnlocked.current = true;
                    })
                    .catch(() => {});
                
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('touchstart', unlockAudio);
            }
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    useEffect(() => {
        const authMode = getAuthMode();
        
        // Always run purge on initialization
        purgeExpiredNotifications();

        if (authMode !== 'authenticate' || !user || !firestore) {
            unsubscribers.current.forEach(unsub => unsub());
            unsubscribers.current = [];
            setCloudCache(null);
            return;
        }

        const userId = user.uid;
        const db = firestore;

        const setupListeners = () => {
            unsubscribers.current.forEach(unsub => unsub());
            unsubscribers.current = [];

            const prefRef = doc(db, 'users', userId, 'preferences', 'settings');
            getDoc(prefRef).then(snap => {
                if (snap.exists()) {
                    updateUserPreferences(snap.data() as UserPreferences);
                }
            }).catch(() => {});

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
                
                const currentAppData = getAppData();
                currentAppData.notifications = items;
                setCloudCache(currentAppData);
                
                // Keep the inbox fresh by purging expired items on every sync
                purgeExpiredNotifications();
                
                window.dispatchEvent(new Event('company-changed'));

                if (!isFirstSnapshot) {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const newNotif = change.doc.data() as AppNotification;
                            const id = change.doc.id;
                            
                            if (processedIds.current.has(id)) return;
                            processedIds.current.add(id);
                            
                            if (processedIds.current.size > 100) {
                                const firstItem = processedIds.current.values().next().value;
                                if (firstItem) processedIds.current.delete(firstItem);
                            }

                            if (newNotif.senderId === userId) return;

                            const isForeground = typeof document !== 'undefined' && document.visibilityState === 'visible';
                            const prefs = getUserPreferences();
                            const isMuted = prefs.notificationSounds === false;

                            if (isForeground && !isMuted && audioRef.current) {
                                try {
                                    audioRef.current.currentTime = 0;
                                    audioRef.current.play().catch(e => {
                                        console.warn("Notification audio blocked by browser policy.", e);
                                    });
                                } catch (e) {
                                    console.error("Audio playback error:", e);
                                }
                            }

                            if (pathnameRef.current === newNotif.link) {
                                markNotificationRead(id);
                                return;
                            }

                            const t = toast({
                                variant: 'premium',
                                duration: 4000,
                                description: React.createElement('div', {
                                    className: "w-full cursor-pointer overflow-hidden",
                                    onClick: () => {
                                        t.dismiss();
                                        markNotificationRead(id);
                                        window.dispatchEvent(new Event('navigation-start'));
                                        router.push(newNotif.link);
                                    }
                                }, 
                                    React.createElement('div', { className: "flex items-center gap-3 p-4 w-full active:bg-muted/50 transition-colors" },
                                        React.createElement('div', {
                                            className: cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-inner border border-white/5",
                                                newNotif.type === 'user_request' ? "bg-amber-500/10 text-amber-600" : 
                                                newNotif.type === 'admin_reply' ? "bg-blue-500/10 text-blue-600" : 
                                                "bg-primary/10 text-primary"
                                            )
                                        }, 
                                            newNotif.type === 'user_request' ? React.createElement(Rocket, { className: "h-5 w-5" }) : 
                                            newNotif.type === 'admin_reply' ? React.createElement(MessageSquare, { className: "h-5 w-5" }) : 
                                            React.createElement(Bell, { className: "h-5 w-5" })
                                        ),
                                        React.createElement('div', { className: "flex-1 min-w-0" },
                                            React.createElement('p', { className: "text-[13px] font-black text-foreground truncate leading-tight mb-0.5 tracking-tight" }, newNotif.title),
                                            React.createElement('p', { className: "text-[11px] text-muted-foreground line-clamp-2 leading-snug font-medium" }, newNotif.message)
                                        ),
                                        React.createElement('div', { className: "shrink-0 flex flex-col items-end gap-1.5 pl-2" },
                                            React.createElement('span', { className: "text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter" }, "Now"),
                                            React.createElement(ChevronRight, { className: "h-3 w-3 text-muted-foreground/20" })
                                        )
                                    )
                                )
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

            const companiesRef = collection(db, 'users', userId, 'companies');
            const unsubCompanies = onSnapshot(companiesRef, (snapshot) => {
                const companies: Company[] = snapshot.docs.map(d => d.data() as Company);
                
                if (companies.length === 0) {
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

            if (activeCompanyId) {
                const companyBase = `users/${userId}/companies/${activeCompanyId}`;

                const tasksRef = collection(db, companyBase, 'tasks');
                const unsubTasks = onSnapshot(tasksRef, (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'tasks', snap.docs.map(d => d.data() as Task));
                    markInitialSyncComplete(activeCompanyId);
                }, (error) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: tasksRef.path,
                        operation: 'list',
                    }));
                });
                unsubscribers.current.push(unsubTasks);

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
                        path: devsRef.path,
                        operation: 'get',
                    }));
                });
                unsubscribers.current.push(unsubTesters);

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
    }, [user, firestore, activeCompanyId, userProfile?.role]);
}

function _updateCloudCachePart(companyId: string, part: keyof CompanyData, data: any) {
    const current = getAppData();
    if (!current.companyData[companyId]) {
        current.companyData[companyId] = _getEmptyCompanyData();
    }

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
