// Stepper.jsx actualizado
import React, { useState, Children, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isValidPhone } from "@/utils/phone-validation"; // Ajusta la ruta según tu estructura

export default function Stepper({
    children,
    initialStep = 1,
    onStepChange = () => { },
    onFinalStepCompleted = () => { },
    formData,
    setFieldErrors,
    stepCircleContainerClassName = "",
    stepContainerClassName = "",
    contentClassName = "",
    footerClassName = "",
    backButtonProps = {},
    nextButtonProps = {},
    backButtonText = "Atrás",
    nextButtonText = "Continuar",
    disableStepIndicators = false,
    renderStepIndicator,
    ...rest
}) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [direction, setDirection] = useState(0);
    const stepsArray = Children.toArray(children);
    const totalSteps = stepsArray.length;
    const isCompleted = currentStep > totalSteps;
    const isLastStep = currentStep === totalSteps;

    const validateFields = () => {
        if (!formData) return false;
        const errors = {};

        if (currentStep === 1) {
            if (!formData?.datetime) {
                errors.datetime = "Seleccioná una fecha y hora.";
            } else {
                const now = new Date();
                if (formData.datetime < now) {
                    errors.datetime = "No puedes seleccionar una fecha pasada.";
                }
                const hours = formData.datetime.getHours();
                const minutes = formData.datetime.getMinutes();
                if (hours < 9 || (hours === 18 && minutes > 0) || hours > 18) {
                    errors.datetime = "Solo horarios de 9:00 a 18:00.";
                }
            }
        } else if (currentStep === 2) {
            if (!formData?.phone?.trim()) {
                errors.phone = "El teléfono es obligatorio.";
            } else if (!isValidPhone(formData.phone.trim())) {
                errors.phone = "Ingresá un número de teléfono válido.";
            }

            if (!formData?.message?.trim()) {
                errors.message = "El mensaje es obligatorio.";
            } else if (formData.message.trim().length < 10) {
                errors.message = "El mensaje debe tener al menos 10 caracteres.";
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const updateStep = (newStep) => {
        if (newStep > totalSteps) {
            const isValid = validateFields();
            if (!isValid) return;
            onFinalStepCompleted();
        } else {
            setCurrentStep(newStep);
            onStepChange(newStep);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setDirection(-1);
            updateStep(currentStep - 1);
        }
    };

    const handleNext = () => {
        const isValid = validateFields();
        if (!isValid) return;

        setDirection(1);
        updateStep(currentStep + 1);
    };

    return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center p-2" {...rest}>
            {/* (resto del contenido sin cambios) */}
            <div className={`mx-auto w-full rounded-4xl ${stepCircleContainerClassName}`}>
                <div className={`${stepContainerClassName} flex w-full items-center p-8`}>
                    {stepsArray.map((_, index) => {
                        const stepNumber = index + 1;
                        const isNotLastStep = index < totalSteps - 1;
                        return (
                            <React.Fragment key={stepNumber}>
                                {renderStepIndicator ? (
                                    renderStepIndicator({
                                        step: stepNumber,
                                        currentStep,
                                        onStepClick: (clicked) => {
                                            setDirection(clicked > currentStep ? 1 : -1);
                                            updateStep(clicked);
                                        },
                                    })
                                ) : (
                                    <StepIndicator
                                        step={stepNumber}
                                        disableStepIndicators={disableStepIndicators}
                                        currentStep={currentStep}
                                        onClickStep={(clicked) => {
                                            setDirection(clicked > currentStep ? 1 : -1);
                                            updateStep(clicked);
                                        }}
                                    />
                                )}
                                {isNotLastStep && (
                                    <StepConnector isComplete={currentStep > stepNumber} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
                <StepContentWrapper
                    isCompleted={isCompleted}
                    currentStep={currentStep}
                    direction={direction}
                    className={`space-y-2 px-8 ${contentClassName}`}
                >
                    {stepsArray[currentStep - 1]}
                </StepContentWrapper>
                {!isCompleted && (
                    <div className={`px-8 pb-8 ${footerClassName}`}>
                        <div className={`mt-10 flex ${currentStep !== 1 ? "justify-between" : "justify-end"}`}>
                            {currentStep !== 1 && (
                                <button
                                    onClick={handleBack}
                                    className={`duration-350 rounded px-2 py-1 transition ${currentStep === 1
                                        ? "pointer-events-none opacity-50 text-neutral-400"
                                        : "text-neutral-400 hover:text-neutral-700"}`}
                                    {...backButtonProps}
                                >
                                    {backButtonText}
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="duration-350 flex items-center justify-center rounded-full bg-green-500 py-1.5 px-3.5 font-medium tracking-tight text-black transition hover:bg-green-600 active:bg-green-700"
                                {...nextButtonProps}
                            >
                                {isLastStep ? "Enviar" : nextButtonText}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ... (resto del código sin cambios) ...


function StepContentWrapper({ isCompleted, currentStep, direction, children, className }) {
    const [parentHeight, setParentHeight] = useState(0);

    return (
        <motion.div
            style={{ position: "relative", overflow: "hidden" }}
            animate={{ height: isCompleted ? 0 : parentHeight }}
            transition={{ type: "spring", duration: 0.4 }}
            className={className}
        >
            <AnimatePresence initial={false} mode="sync" custom={direction}>
                {!isCompleted && (
                    <SlideTransition
                        key={currentStep}
                        direction={direction}
                        onHeightReady={(h) => setParentHeight(h)}
                    >
                        {children}
                    </SlideTransition>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function SlideTransition({ children, direction, onHeightReady }) {
    const containerRef = useRef(null);

    useLayoutEffect(() => {
        if (containerRef.current) onHeightReady(containerRef.current.offsetHeight);
    }, [children, onHeightReady]);

    return (
        <motion.div
            ref={containerRef}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4 }}
            style={{ position: "absolute", left: 0, right: 0, top: 0 }}
        >
            {children}
        </motion.div>
    );
}

const stepVariants = {
    enter: (dir) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
    center: { x: "0%", opacity: 1 },
    exit: (dir) => ({ x: dir >= 0 ? "50%" : "-50%", opacity: 0 }),
};

export function Step({ children }) {
    return <div className="px-8">{children}</div>;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
    const status = currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";

    const handleClick = () => {
        if (step !== currentStep && !disableStepIndicators) onClickStep(step);
    };

    return (
        <motion.div
            onClick={handleClick}
            className="relative cursor-pointer outline-none focus:outline-none"
            animate={status}
            initial={false}
        >
            <motion.div
                variants={{
                    inactive: { scale: 1, backgroundColor: "#222", color: "#a3a3a3" },
                    active: { scale: 1, backgroundColor: "#00d8ff", color: "#00d8ff" },
                    complete: { scale: 1, backgroundColor: "#00d8ff", color: "#3b82f6" },
                }}
                transition={{ duration: 0.3 }}
                className="flex h-8 w-8 items-center justify-center rounded-full font-semibold"
            >
                {status === "complete" ? (
                    <CheckIcon className="h-4 w-4 text-black" />
                ) : status === "active" ? (
                    <div className="h-3 w-3 rounded-full bg-[#060606]" />
                ) : (
                    <span className="text-sm">{step}</span>
                )}
            </motion.div>
        </motion.div>
    );
}

function StepConnector({ isComplete }) {
    const lineVariants = {
        incomplete: { width: 0, backgroundColor: "transparent" },
        complete: { width: "100%", backgroundColor: "#00d8ff" },
    };

    return (
        <div className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded bg-neutral-600">
            <motion.div
                className="absolute left-0 top-0 h-full"
                variants={lineVariants}
                initial={false}
                animate={isComplete ? "complete" : "incomplete"}
                transition={{ duration: 0.4 }}
            />
        </div>
    );
}

function CheckIcon(props) {
    return (
        <svg
            {...props}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
        >
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
            />
        </svg>
    );
}
