/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

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

    const openFeedback = () => setShowFeedback(true);
    const openWhatsNew = () => setShowWhatsNew(true);

    return (
        <UIContext.Provider value={{ 
            showFeedback, 
            setShowFeedback, 
            showWhatsNew, 
            setShowWhatsNew,
            openFeedback,
            openWhatsNew
        }}>
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
