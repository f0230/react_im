import logoDTE from '../assets/dte_lohace.webp';


const Footer = () => {
    return (
        <footer className="bg-white text-black px-6 md:px-12 py-2 font-product border-t border-neutral-200 ">
            <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row justify-between items-center  h-[300px]  md:h-[500px] px-8">

                {/* Columna izquierda: Contacto (solo visible en md+) */}
                <div className="hidden md:flex flex-col justify-between w-full md:w-1/2 h-full py-8">
                    <div className=" ">
                        <p className="text-[34px] text-neutral-500">Contáctanos</p>
                        <h2 className="text-[45px] md:text-[60px] leading-none">Trabajemos juntos</h2>
                        <p className="md:text-[30px] text-normal">y llegá más lejos</p>
                    </div>
                    <div className="text-[30px]">
                        <p className="text-black">grupo@grupodte.com</p>
                        <p className="text-black">096 219 905</p>
                    </div>
                    <div className=" text-[17px]">
                        <p>Uruguay</p>
                        <p>2020 – 2025</p>
                    </div>
                </div>

                {/* Columna derecha: Logo + botones */}
                <div className="flex flex-col md:justify-center justify-between items-center w-[350px] h-full py-8 gap-8">
                    <div className="flex items-center w-[300px] px-2">
                        <img src={logoDTE} alt="Grupo DTE" />
                    </div>
                    <div className="flex flex-col px-4 gap-3 w-[350px]">
                        <a
                            href="#"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white text-[22px]  h-[42px]  rounded-full text-center font-product hover:opacity-80 transition"
                        >
                            Agenda una reunión
                        </a>
                        <a
                            href="https://wa.me/59896219905"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white text-[22px]   h-[42px] rounded-full text-center font-product hover:opacity-80 transition"
                        >
                            Hablemos por Whatsapp
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 items-center w-full max-w-[1080px] mx-auto px-4">
                {/* Izquierda: solo visible en mobile */}
                <div className="block md:invisible text-left">
                    <p className="text-[10px] text-neutral-500">© 2025</p>
                </div>

                {/* Centro: siempre visible y perfectamente centrado */}
                <div className="text-center">
                    <p className="text-[10px] text-neutral-500">Desarrollado por DTE</p>
                </div>

                {/* Derecha: solo visible en mobile */}
                <div className="block md:invisible text-right">
                    <p className="text-[10px] text-neutral-500">Montevideo, Uruguay</p>
                </div>
            </div>


        </footer>


    );
};

export default Footer;
