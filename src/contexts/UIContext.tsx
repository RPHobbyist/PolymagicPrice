/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 */

import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

interface UIContextType {
    showFeedback: boolean;
    setShowFeedback: (show: boolean) => void;
    showWhatsNew: boolean;
    setShowWhatsNew: (show: boolean) => void;
    openFeedback: () => void;
    openWhatsNew: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [showFeedback, setShowFeedback] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);

    const openFeedback = useCallback(() => setShowFeedback(true), []);
    const openWhatsNew = useCallback(() => setShowWhatsNew(true), []);

    // A fresh object here re-rendered every consumer of this context on each render of the
    // provider — and this one wraps the whole app. Every other provider in the codebase already
    // memoizes its value.
    const value = useMemo(() => ({
        showFeedback,
        setShowFeedback,
        showWhatsNew,
        setShowWhatsNew,
        openFeedback,
        openWhatsNew
    }), [showFeedback, showWhatsNew, openFeedback, openWhatsNew]);

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
