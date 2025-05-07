import React from "react";

const Section7 = () => {
    const sectionStyle = {
        backgroundColor: "black",
        width: "100%",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    };

    const containerStyle = {
        width: "100%",
        maxWidth: "1080px",
        margin: "0 auto",
        color: "white",
        textAlign: "center",
    };

    return (
        <div style={sectionStyle}>
            <div style={containerStyle}>
                <h1>Responsive Section</h1>
                <p>This section is fully responsive.</p>
            </div>
        </div>
    );
};

export default Section7;