import React, { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const GoogleLoginWrapper = ({ onLoginSuccess }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(
        !!localStorage.getItem("google_token")
    );

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const handleSuccess = (response) => {
        const token = response.credential;
        localStorage.setItem("google_token", token);
        setIsLoggedIn(true);
        onLoginSuccess();
    };

    if (!clientId) {
        console.warn(
            "❌ VITE_GOOGLE_CLIENT_ID está undefined. Verificá tu .env.local o variables en Vercel."
        );
    }

    return (
        <GoogleOAuthProvider clientId={clientId || "missing-client-id"}>
            {!isLoggedIn && (
                <div className="flex flex-col items-center justify-center text-center gap-4 p-6">
                    <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-800">
                        Iniciá sesión con Google para continuar
                    </p>

                    {clientId ? (
                        <div className="scale-110">
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => console.log("Fallo el login")}
                                theme="outline"
                                size="large"
                            />
                        </div>
                    ) : (
                        <div className="text-red-600 text-sm">
                            ⚠️ Error: Falta clientId de Google. Verificá configuración.
                        </div>
                    )}
                </div>
            )}
        </GoogleOAuthProvider>
    );
};

export default GoogleLoginWrapper;
