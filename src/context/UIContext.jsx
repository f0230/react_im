import React, { createContext, useContext, useState } from "react";

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [isNavbarOpen, setIsNavbarOpen] = useState(false);

    return (
        <UIContext.Provider value={{ isNavbarOpen, setIsNavbarOpen }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return context;
};
