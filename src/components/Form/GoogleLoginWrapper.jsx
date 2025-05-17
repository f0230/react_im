import React, { useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const GoogleLoginWrapper = ({ onLoginSuccess }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("google_token"));

    const handleSuccess = (response) => {
        const token = response.credential;
        localStorage.setItem("google_token", token);
        setIsLoggedIn(true);
        onLoginSuccess(); // notifica al padre que ya está logueado
    };

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            {!isLoggedIn && (
                <div className="flex flex-col items-center space-y-4">
                    <p className="text-lg font-medium">Iniciá sesión con Google para continuar</p>
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={() => console.log("Fallo el login")}
                    />
                </div>
            )}
        </GoogleOAuthProvider>
    );
};

export default GoogleLoginWrapper;
