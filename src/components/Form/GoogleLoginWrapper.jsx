import React from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const GoogleLoginWrapper = ({ onLoginSuccess }) => {
    const handleSuccess = (response) => {
        const token = response.credential;
        localStorage.setItem("google_token", token);
        onLoginSuccess(); // Notifica al componente padre (StepperModal)
    };

    const handleError = () => {
        console.error("❌ Error al iniciar sesión con Google");
    };

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <div className="flex flex-col items-center justify-center gap-4 text-center px-4 py-6">
                <p className="text-base sm:text-lg font-semibold text-gray-800">
                    Iniciá sesión con Google para continuar
                </p>
                <GoogleLogin onSuccess={handleSuccess} onError={handleError} />
            </div>
        </GoogleOAuthProvider>
    );
};

export default GoogleLoginWrapper;
