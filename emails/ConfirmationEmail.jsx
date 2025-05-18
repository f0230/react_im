// /emails/ConfirmationEmail.jsx
import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Heading, Hr } from '@react-email/components';

export const ConfirmationEmail = ({ name, summary, formattedDate, description }) => {
return (
<Html>

<Head />
<Preview>Tu reunión fue confirmada ✅</Preview>

<Body style={{ backgroundColor: '#f9fafb' , fontFamily: 'sans-serif' }}>
    <Container style={{ maxWidth: '600px' , margin: 'auto' , padding: '32px' }}>
        <img src="https://grupodte.com/logo.png" alt="Grupo DTE" style={{ width: 160, marginBottom: 24 }} />
        <Heading as="h2">¡Hola {name}!</Heading>
        <Text>Gracias por agendar una reunión con nosotros.</Text>

        <Section style={{ backgroundColor: '#fff' , padding: '16px' , borderRadius: '8px' , border: '1px solid #e5e7eb'
            }}>
            <Text><strong>📌 Tema:</strong> {summary}</Text>
            <Text><strong>🕒 Fecha:</strong> {formattedDate}</Text>
            <Text><strong>📝 Mensaje:</strong> {description}</Text>
        </Section>

        <Text style={{ marginTop: 24 }}>
            Nos vemos pronto,<br />
            <strong>Equipo DTE</strong>
        </Text>

        <Hr />
        <Text style={{ fontSize: 13, color: '#9ca3af' , textAlign: 'center' }}>
            © {new Date().getFullYear()} Grupo DTE – <a href="https://grupodte.com">grupodte.com</a>
        </Text>
    </Container>
</Body>

</Html>
);
};

export default ConfirmationEmail;