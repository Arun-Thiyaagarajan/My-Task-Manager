
'use client';

import { useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    query, 
    orderBy,
    setDoc
} from 'firebase/firestore';
import { 
    getAppData, 
    setCloudCache, 
    getActiveCompanyId,
    setActiveCompanyId,
    getAuthMode
} from '@/lib/data';
import type { Task, Note, Log, Company, MyTaskManagerData, CompanyData } from '@/lib/types';
import { INITIAL_RELEASES, INITIAL_UI_CONFIG, TASK_STATUSES, INITIAL_REPOSITORY_CONFIGS, ENVIRONMENTS } from '@/lib/constants';

export function useTaskFlowData() {
    const { user, firestore } = useFirebase();
    const activeCompanyId = getActiveCompanyId();
    const unsubscribers = useRef<(() => void)[]>([]);

    useEffect(() => {
        const authMode = getAuthMode();
        if (authMode !== 'authenticate' || !user || !firestore) {
            setCloudCache(null);
            return;
        }

        const userId = user.uid;
        const db = firestore;

        const setupListeners = () => {
            // Cleanup existing listeners
            unsubscribers.current.forEach(unsub => unsub());
            unsubscribers.current = [];

            // 1. Companies Metadata Listener
            const companiesRef = collection(db, 'users', userId, 'companies');
            const unsubCompanies = onSnapshot(companiesRef, (snapshot) => {
                const companies: Company[] = snapshot.docs.map(d => d.data() as Company);
                
                if (companies.length === 0) {
                    // Bootstrap default company if none exists in cloud
                    const defaultId = 'company-default';
                    const defaultCompany = { id: defaultId, name: 'My Cloud Workspace' };
                    setDoc(doc(db, 'users', userId, 'companies', defaultId), defaultCompany);
                    return;
                }

                const currentData = getAppData();
                const updatedData: MyTaskManagerData = {
                    ...currentData,
                    companies,
                    activeCompanyId: companies.some(c => c.id === activeCompanyId) ? activeCompanyId : companies[0].id
                };

                // Initialize empty data containers for each company if not present
                companies.forEach(company => {
                    if (!updatedData.companyData[company.id]) {
                        updatedData.companyData[company.id] = _getEmptyCompanyData();
                    }
                });

                setCloudCache(updatedData);
                window.dispatchEvent(new Event('company-changed'));
            });
            unsubscribers.current.push(unsubCompanies);

            // 2. Active Company Sub-resource Listeners
            if (activeCompanyId) {
                const companyBase = `users/${userId}/companies/${activeCompanyId}`;

                // Tasks
                const unsubTasks = onSnapshot(collection(db, companyBase, 'tasks'), (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'tasks', snap.docs.map(d => d.data() as Task));
                });
                unsubscribers.current.push(unsubTasks);

                // Notes
                const unsubNotes = onSnapshot(collection(db, companyBase, 'notes'), (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'notes', snap.docs.map(d => d.data() as Note));
                });
                unsubscribers.current.push(unsubNotes);

                // Logs
                const unsubLogs = onSnapshot(query(collection(db, companyBase, 'logs'), orderBy('timestamp', 'desc')), (snap) => {
                    _updateCloudCachePart(activeCompanyId, 'logs', snap.docs.map(d => d.data() as Log));
                });
                unsubscribers.current.push(unsubLogs);

                // UI Config (Single Document)
                const unsubConfig = onSnapshot(doc(db, companyBase, 'settings', 'uiConfig'), (snap) => {
                    if (snap.exists()) {
                        _updateCloudCachePart(activeCompanyId, 'uiConfig', snap.data());
                    }
                });
                unsubscribers.current.push(unsubConfig);

                // Developers (Array in Document)
                const unsubDevs = onSnapshot(doc(db, companyBase, 'people', 'developers'), (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'developers', snap.data().list || []);
                });
                unsubscribers.current.push(unsubDevs);

                // Testers
                const unsubTesters = onSnapshot(doc(db, companyBase, 'people', 'testers'), (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'testers', snap.data().list || []);
                });
                unsubscribers.current.push(unsubTesters);

                // General Reminders
                const unsubReminders = onSnapshot(doc(db, companyBase, 'reminders', 'general'), (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'generalReminders', snap.data().list || []);
                });
                unsubscribers.current.push(unsubReminders);

                // Release Updates
                const unsubReleases = onSnapshot(doc(db, companyBase, 'releases', 'updates'), (snap) => {
                    if (snap.exists()) _updateCloudCachePart(activeCompanyId, 'releaseUpdates', snap.data().list || []);
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

    // Separate tasks into active and trash based on deletedAt
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
