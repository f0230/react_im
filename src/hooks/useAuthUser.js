import { useState, useEffect, useCallback } from "react";

function parseJwt(token) {
    try {
        const base64Payload = token.split(".")[1];
        const payload = JSON.parse(atob(base64Payload));
        return {
            name: payload.name,
            email: payload.email,
        };
    } catch (error) {
        console.error("❌ Error al decodificar el token JWT:", error);
        return null;
    }
}

export const useAuthUser = () => {
    const [user, setUser] = useState(null);
    const [token, setTokenState] = useState(null);

    // 🔐 Inicializar desde localStorage solo en cliente
    useEffect(() => {
        if (typeof window === "undefined") return;

        const storedToken = localStorage.getItem("google_token");
        if (storedToken) {
            const parsedUser = parseJwt(storedToken);
            if (parsedUser) {
                setTokenState(storedToken);
                setUser(parsedUser);
            } else {
                localStorage.removeItem("google_token");
            }
        }
    }, []);

    const setToken = useCallback((newToken) => {
        if (typeof window === "undefined") return;

        localStorage.setItem("google_token", newToken);
        const parsedUser = parseJwt(newToken);
        if (parsedUser) {
            setTokenState(newToken);
            setUser(parsedUser);
        } else {
            console.warn("❌ Token inválido, no se actualizó.");
        }
    }, []);

    const logout = useCallback(() => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("google_token");
        }
        setTokenState(null);
        setUser(null);
    }, []);

    return {
        user,
        token,
        isAuthenticated: !!token,
        setToken,
        logout,
    };
};
