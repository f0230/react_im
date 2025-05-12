import React from "react";

const Section5 = () => {
    return (
        <section className="font-product relative w-full flex h-[550px] md:h-[350px] justify-center items-center z-10">
            <div className="flex flex-col md:flex-row w-full max-w-[1440px] px-4 gap-10 items-center justify-between">

                {/* Columna izquierda */}
                <div className="w-full md:w-1/2 flex flex-col items-center">
                    <h2 className="text-[60px] text-green font-normal leading-none">y +</h2>
                    <div className="mt-12 w-[162px] h-[10px] bg-green" />
                </div>

                {/* Columna derecha */}
                <div className="w-full md:w-1/2 flex flex-col items-center text-center">
                    <p className="hidden md:block text-[37px] max-w-[500px] font-normal leading-none">
                        Arquitectura, económica, asesoramiento legal, logística...
                    </p>
                    <p className="md:hidden text-[35px] max-w-[179px] font-normal leading-none">
                        ECO. ARQ. DES. MKT. LEG.
                    </p>
                    <button className="mt-6 w-[176px] h-[36px] text-[13px] md:text-[17px] bg-greyburger text-white rounded-full hover:bg-blue-400 transition duration-300">
                        más información
                    </button>
                </div>

            </div>
        </section>
    );
};

export default Section5;
