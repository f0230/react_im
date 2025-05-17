import React, { useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const GoogleLoginWrapper = ({ onLoginSuccess }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(
        !!localStorage.getItem("google_token")
    );

    const handleSuccess = (response) => {
        const token = response.credential;
        localStorage.setItem("google_token", token);
        setIsLoggedIn(true);
        onLoginSuccess(); // notifica al padre que ya está logueado
    };

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            {!isLoggedIn && (
                <div className="flex flex-col items-center justify-center text-center gap-4 p-6">
                    <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-800">
                        Iniciá sesión con Google para continuar
                    </p>
                    <div className="scale-110">
                        <GoogleLogin
                            onSuccess={handleSuccess}
                            onError={() => console.log("Fallo el login")}
                            size="large"
                            theme="outline"
                            width="100%"
                        />
                    </div>
                </div>
            )}
        </GoogleOAuthProvider>
    );
};

export default GoogleLoginWrapper;
