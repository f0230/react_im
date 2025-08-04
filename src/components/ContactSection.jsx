import React from 'react';

const ContactSection = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">¿Listo para empezar tu proyecto?</h2>
        <p className="text-xl text-gray-600 mb-12">
          Contáctanos hoy mismo para discutir tus ideas y cómo podemos ayudarte a hacerlas realidad.
        </p>
        <a
          href="/contact"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300"
        >
          Contáctanos
        </a>
      </div>
    </section>
  );
};

export default ContactSection;
