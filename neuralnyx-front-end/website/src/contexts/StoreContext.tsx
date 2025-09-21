'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Simple key-value store
type Store = Record<string, any>;

// Create context
const StoreContext = createContext<{
    store: Store;
    set: (key: string, value: any) => void;
    get: (key: string) => any;
    remove: (key: string) => void;
    clear: () => void;
} | null>(null);

// Store provider component
export function StoreProvider({ children }: { children: ReactNode }) {
    const [store, setStore] = useState<Store>({});

    const set = (key: string, value: any) => {
        setStore(prev => ({ ...prev, [key]: value }));
    };

    const get = (key: string) => {
        return store[key];
    };

    const remove = (key: string) => {
        setStore(prev => {
            const { [key]: removed, ...rest } = prev;
            return rest;
        });
    };

    const clear = () => {
        setStore({});
    };

    return (
        <StoreContext.Provider value={{ store, set, get, remove, clear }}>
            {children}
        </StoreContext.Provider>
    );
}

// Custom hook to use the store
export function useStore() {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
}
