const Footer = () => {
    return (
        <footer className="bg-white text-black px-6 md:px-12 py-16 font-sans border-t border-neutral-200">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                {/* Columna izquierda: Contacto */}
                <div className="space-y-3">
                    <p className="text-sm text-neutral-500">Contáctanos</p>
                    <h2 className="text-2xl md:text-3xl font-semibold">Trabajemos juntos</h2>
                    <p className="text-sm text-neutral-500">y llegá más lejos</p>

                    <div className="mt-6 space-y-1 text-sm">
                        <p className="text-black">info@grupodte.com</p>
                        <p className="text-black">092 174 188</p>
                    </div>
                </div>

                {/* Columna derecha: Logo + botones */}
                <div className="flex flex-col md:items-end gap-6">
                    {/* Logo combinado */}
                    <div className="flex items-center gap-2">
                        <img src="/logoDTE.svg" alt="Grupo DTE" className="h-6" />
                        <span className="text-black text-lg font-medium">lo</span>
                        <span className="bg-green-500 text-black text-lg font-semibold px-2 py-1 rounded-sm">hace</span>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <a
                            href="https://calendly.com/tu-reunion"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white text-sm px-5 py-2 rounded-full text-center hover:opacity-80 transition"
                        >
                            Agenda una reunión
                        </a>
                        <a
                            href="https://wa.me/59892174188"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white text-sm px-5 py-2 rounded-full text-center hover:opacity-80 transition"
                        >
                            Hablemos por Whatsapp
                        </a>
                    </div>
                </div>
            </div>

            {/* Línea base */}
            <div className="mt-12 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500 space-y-1">
                <p>Peñarol, Uruguay</p>
                <p>2020 – 2025</p>
                <p className="text-[10px] text-red-500">
                    Site web diseñado y desarrollado por DTE
                </p>
            </div>
        </footer>
    );
};

export default Footer;
