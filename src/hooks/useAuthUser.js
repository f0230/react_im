import { useState, useEffect } from "react";

export const useAuthUser = () => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("google_token") || null);

    useEffect(() => {
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setUser({
                name: payload.name,
                email: payload.email,
            });
        } catch (e) {
            console.error("Error parsing token", e);
            localStorage.removeItem("google_token");
        }
    }, [token]);

    return {
        user,
        token,
        isAuthenticated: !!token,
        setToken: (newToken) => {
            localStorage.setItem("google_token", newToken);
            setToken(newToken);
        },
        logout: () => {
            localStorage.removeItem("google_token");
            setToken(null);
        }
    };
};
