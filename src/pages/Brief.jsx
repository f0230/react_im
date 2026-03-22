import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

import logoDte from '@/assets/LOGODTE.svg';
import { supabase } from '@/lib/supabaseClient';
import { loadStoredBrief, saveStoredBrief } from '@/lib/briefStorage';

const TOTAL = 8;

const INITIAL = {
    etapa: '',
    objetivoPrincipal: '',
    servicioInteres: '',
    facturacionMensual: '',
    canalPrincipal: '',
    activosDigitales: '',
    presupuesto: '',
    urgencia: '',
};

const getInitialData = () => {
    const stored = loadStoredBrief();
    if (!stored) return INITIAL;

    return { ...INITIAL, ...stored };
};

const getInitialStep = () => {
    const stored = loadStoredBrief();
    const lastStep = Number(stored?.lastStep);

    if (!Number.isFinite(lastStep)) return 0;
    if (stored?.completedAt) return TOTAL + 1;

    return Math.min(Math.max(lastStep, 0), TOTAL);
};

function StepMeta({ step }) {
    return (
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0DD122]">
            Paso {step} de {TOTAL}
        </p>
    );
}

function BackBtn({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65 transition-colors hover:border-white/20 hover:text-white"
        >
            <ArrowLeft className="h-4 w-4" />
            Volver
        </button>
    );
}

function StepChoice({
    step,
    question,
    value,
    options,
    onBack,
    onChoose,
}) {
    return (
        <div className="flex w-full flex-col items-center gap-6 text-center">
            <div className="space-y-3">
                <StepMeta step={step} />
                <h2 className="font-google-sans-flex text-[28px] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-[38px]">
                    {question}
                </h2>
            </div>

            <div className="grid w-full gap-3">
                {options.map((option) => {
                    const isActive = value === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChoose(option.value)}
                            className={`w-full rounded-[22px] border px-4 py-4 text-left transition-all sm:px-5 ${isActive
                                ? 'border-[#0DD122] bg-[#0DD122] text-black shadow-[0_18px_48px_-24px_rgba(13,209,34,0.7)]'
                                : 'border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.05]'
                                }`}
                        >
                            <span className="block text-[14px] font-semibold leading-snug sm:text-[15px]">
                                {option.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {step > 1 ? <BackBtn onClick={onBack} /> : null}
        </div>
    );
}

const Brief = () => {
    const { bookingId } = useParams();
    const transitionTimerRef = useRef(null);

    const [step, setStep] = useState(getInitialStep);
    const [visible, setVisible] = useState(true);
    const [data, setData] = useState(getInitialData);

    useEffect(() => {
        saveStoredBrief({ ...data, lastStep: step });
    }, [data, step]);

    useEffect(() => () => {
        if (transitionTimerRef.current) {
            window.clearTimeout(transitionTimerRef.current);
        }
    }, []);

    const queueTransition = (callback, delay = 180) => {
        if (transitionTimerRef.current) {
            window.clearTimeout(transitionTimerRef.current);
        }

        transitionTimerRef.current = window.setTimeout(callback, delay);
    };

    const transitionTo = (nextStep) => {
        setVisible(false);
        queueTransition(() => {
            setStep(nextStep);
            setVisible(true);
        });
    };

    const goNext = () => transitionTo(Math.min(step + 1, TOTAL));
    const goBack = () => transitionTo(Math.max(step - 1, 0));

    const finishBrief = async (nextData) => {
        const now = new Date().toISOString();

        const localPayload = {
            ...nextData,
            lastStep: TOTAL,
            completedAt: now,
        };
        saveStoredBrief(localPayload);

        try {
            await supabase.from('briefs').insert({
                cal_booking_uid: bookingId || null,
                etapa: nextData.etapa || null,
                objetivo_principal: nextData.objetivoPrincipal || null,
                servicio_interes: nextData.servicioInteres || null,
                facturacion_mensual: nextData.facturacionMensual || null,
                canal_principal: nextData.canalPrincipal || null,
                activos_digitales: nextData.activosDigitales || null,
                presupuesto: nextData.presupuesto || null,
                urgencia: nextData.urgencia || null,
                completed_at: now,
            });
        } catch {
            // El brief ya quedó en localStorage como fallback
        }

        setVisible(false);
        queueTransition(() => {
            setStep(TOTAL + 1);
            setVisible(true);
        }, 240);
    };

    const choose = (field, value) => {
        const nextData = { ...data, [field]: value };
        setData(nextData);

        if (step === TOTAL) {
            finishBrief(nextData);
            return;
        }

        setVisible(false);
        queueTransition(() => {
            setStep((current) => Math.min(current + 1, TOTAL));
            setVisible(true);
        }, 180);
    };

    const progressPct = step === 0 ? 0 : step > TOTAL ? 100 : Math.round((step / TOTAL) * 100);

    return (
        <div className="min-h-screen bg-[#050505] font-product text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-[-12%] h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-[#0DD122]/10 blur-[110px] sm:h-[360px] sm:w-[360px]" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[240px] w-[240px] rounded-full bg-white/[0.05] blur-[120px] sm:h-[320px] sm:w-[320px]" />
            </div>

            <header className="relative z-10 border-b border-white/10">
                <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
                    <img src={logoDte} alt="GrupoDTE" className="h-7 w-auto sm:h-8" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35 sm:text-[11px]">
                        Brief Comercial
                    </span>
                </div>
                <div className="h-[3px] w-full bg-white/10">
                    <div
                        className="h-full bg-[#0DD122] transition-all duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </header>

            <main
                className="relative z-10 flex min-h-[calc(100vh-76px)] items-center justify-center px-4 py-8 sm:px-6 sm:py-10"
                style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0px)' : 'translateY(10px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                }}
            >
                <div className="w-full max-w-xl">
                    {step === 0 ? (
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0DD122]">
                                GrupoDTE
                            </div>

                            <h1 className="font-google-sans-flex text-[34px] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[52px]">
                                Un brief corto para llegar preparados a la llamada.
                            </h1>

                            <p className="max-w-[34ch] text-sm leading-relaxed text-white/52 sm:text-base">
                                Respondé 8 preguntas rápidas así aprovechamos mejor la reunión.
                            </p>

                            <button
                                type="button"
                                onClick={goNext}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0DD122] px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#10f129]"
                            >
                                Empezar
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    ) : null}

                    {step === 1 ? (
                        <StepChoice
                            step={1}
                            question="¿En qué etapa está hoy tu negocio?"
                            value={data.etapa}
                            onBack={goBack}
                            onChoose={(value) => choose('etapa', value)}
                            options={[
                                { value: 'Ya vendemos y queremos ordenar el crecimiento', label: 'Ya vendemos y queremos ordenar el crecimiento' },
                                { value: 'Vendemos, pero el crecimiento es irregular', label: 'Vendemos, pero el crecimiento es irregular' },
                                { value: 'Estamos validando oferta y proceso comercial', label: 'Estamos validando oferta y proceso comercial' },
                                { value: 'Somos un equipo interno de una empresa consolidada', label: 'Somos un equipo interno de una empresa consolidada' },
                            ]}
                        />
                    ) : null}

                    {step === 2 ? (
                        <StepChoice
                            step={2}
                            question="¿Qué querés resolver primero?"
                            value={data.objetivoPrincipal}
                            onBack={goBack}
                            onChoose={(value) => choose('objetivoPrincipal', value)}
                            options={[
                                { value: 'Conseguir más reuniones calificadas', label: 'Conseguir más reuniones calificadas' },
                                { value: 'Mejorar conversión del embudo actual', label: 'Mejorar conversión del embudo actual' },
                                { value: 'Automatizar seguimiento, CRM o WhatsApp', label: 'Automatizar seguimiento, CRM o WhatsApp' },
                                { value: 'Ordenar marketing, ventas y operación en un sistema', label: 'Ordenar marketing, ventas y operación en un sistema' },
                            ]}
                        />
                    ) : null}

                    {step === 3 ? (
                        <StepChoice
                            step={3}
                            question="¿Qué tipo de ayuda te interesa?"
                            value={data.servicioInteres}
                            onBack={goBack}
                            onChoose={(value) => choose('servicioInteres', value)}
                            options={[
                                { value: 'Performance y adquisición', label: 'Performance y adquisición' },
                                { value: 'Landing, web o e-commerce', label: 'Landing, web o e-commerce' },
                                { value: 'Automatizaciones, CRM y operación', label: 'Automatizaciones, CRM y operación' },
                                { value: 'Necesito un sistema completo, no algo aislado', label: 'Necesito un sistema completo, no algo aislado' },
                            ]}
                        />
                    ) : null}

                    {step === 4 ? (
                        <StepChoice
                            step={4}
                            question="¿Qué rango de facturación mensual tiene hoy el negocio?"
                            value={data.facturacionMensual}
                            onBack={goBack}
                            onChoose={(value) => choose('facturacionMensual', value)}
                            options={[
                                { value: 'Menos de USD 2.000', label: 'Menos de USD 2.000' },
                                { value: 'USD 2.000 a 10.000', label: 'USD 2.000 a 10.000' },
                                { value: 'USD 10.000 a 30.000', label: 'USD 10.000 a 30.000' },
                                { value: 'Más de USD 30.000', label: 'Más de USD 30.000' },
                                { value: 'Prefiero conversarlo en la llamada', label: 'Prefiero conversarlo en la llamada' },
                            ]}
                        />
                    ) : null}

                    {step === 5 ? (
                        <StepChoice
                            step={5}
                            question="¿De dónde llegan hoy la mayoría de las ventas o consultas?"
                            value={data.canalPrincipal}
                            onBack={goBack}
                            onChoose={(value) => choose('canalPrincipal', value)}
                            options={[
                                { value: 'Principalmente por referidos', label: 'Principalmente por referidos' },
                                { value: 'Orgánico y redes sociales', label: 'Orgánico y redes sociales' },
                                { value: 'Publicidad paga', label: 'Publicidad paga' },
                                { value: 'Ventas directas o outbound', label: 'Ventas directas o outbound' },
                                { value: 'Un mix de varios canales', label: 'Un mix de varios canales' },
                            ]}
                        />
                    ) : null}

                    {step === 6 ? (
                        <StepChoice
                            step={6}
                            question="¿Qué tan armado está hoy tu sistema digital/comercial?"
                            value={data.activosDigitales}
                            onBack={goBack}
                            onChoose={(value) => choose('activosDigitales', value)}
                            options={[
                                { value: 'Tenemos web, CRM y campañas activas', label: 'Tenemos web, CRM y campañas activas' },
                                { value: 'Tenemos web pero poco seguimiento o automatización', label: 'Tenemos web pero poco seguimiento o automatización' },
                                { value: 'Tenemos redes y WhatsApp, casi nada más', label: 'Tenemos redes y WhatsApp, casi nada más' },
                                { value: 'Estamos bastante desordenados a nivel digital', label: 'Estamos bastante desordenados a nivel digital' },
                            ]}
                        />
                    ) : null}

                    {step === 7 ? (
                        <StepChoice
                            step={7}
                            question="¿Qué nivel de inversión estás dispuesto a evaluar?"
                            value={data.presupuesto}
                            onBack={goBack}
                            onChoose={(value) => choose('presupuesto', value)}
                            options={[
                                { value: 'Menos de USD 300', label: 'Menos de USD 300' },
                                { value: 'USD 300 a 800', label: 'USD 300 a 800' },
                                { value: 'USD 800 a 1.500', label: 'USD 800 a 1.500' },
                                { value: 'Más de USD 1.500', label: 'Más de USD 1.500' },
                                { value: 'Depende del retorno y del plan', label: 'Depende del retorno y del plan' },
                            ]}
                        />
                    ) : null}

                    {step === 8 ? (
                        <StepChoice
                            step={8}
                            question="¿Con qué urgencia querés mover esto?"
                            value={data.urgencia}
                            onBack={goBack}
                            onChoose={(value) => choose('urgencia', value)}
                            options={[
                                { value: 'Esta semana', label: 'Esta semana' },
                                { value: 'Este mes', label: 'Este mes' },
                                { value: 'En 60 a 90 días', label: 'En 60 a 90 días' },
                                { value: 'Solo estoy investigando por ahora', label: 'Solo estoy investigando por ahora' },
                            ]}
                        />
                    ) : null}

                    {step === TOTAL + 1 ? (
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0DD122]/15">
                                <CheckCircle className="h-8 w-8 text-[#0DD122]" />
                            </div>

                            <h1 className="font-google-sans-flex text-[34px] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[52px]">
                                ¡Listo, gracias!
                            </h1>

                            <p className="max-w-[34ch] text-sm leading-relaxed text-white/52 sm:text-base">
                                Ya tenemos todo lo que necesitamos. Nos vemos en la llamada.
                            </p>
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    );
};

export default Brief;
