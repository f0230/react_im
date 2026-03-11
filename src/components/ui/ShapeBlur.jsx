import React from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const palettes = [
    ['rgba(255,255,255,0.34)', 'rgba(191,219,254,0.42)', 'rgba(148,163,184,0.26)'],
    ['rgba(240,249,255,0.4)', 'rgba(186,230,253,0.45)', 'rgba(226,232,240,0.28)'],
    ['rgba(255,255,255,0.32)', 'rgba(196,181,253,0.35)', 'rgba(186,230,253,0.3)'],
];

const layerStyle = ({ inset, background, blur, opacity, transform, radius, mixBlendMode = 'screen' }) => ({
    position: 'absolute',
    inset,
    background,
    filter: `blur(${blur}px)`,
    opacity,
    transform,
    borderRadius: radius,
    mixBlendMode,
});

const ShapeBlur = ({
    variation = 0,
    pixelRatioProp = 1,
    shapeSize = 1,
    roundness = 0.5,
    borderSize = 0.05,
    circleSize = 0.25,
    circleEdge = 1,
}) => {
    const palette = palettes[((variation % palettes.length) + palettes.length) % palettes.length];
    const density = clamp(pixelRatioProp || 1, 1, 2);
    const scale = clamp(shapeSize || 1, 0.7, 1.35);
    const accent = clamp(circleSize || 0.25, 0.16, 0.58);
    const edge = clamp(circleEdge || 1, 0.5, 1.6);
    const borderOpacity = clamp(borderSize || 0.05, 0.03, 0.18);
    const radius = `${Math.round(32 + roundness * 52)}px`;
    const blur = 52 * density * edge;

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                borderRadius: radius,
            }}
        >
            <div
                style={layerStyle({
                    inset: '-14%',
                    background: `radial-gradient(circle at 18% 24%, ${palette[0]} 0%, transparent 34%), radial-gradient(circle at 78% 24%, ${palette[1]} 0%, transparent 32%), radial-gradient(circle at 52% 88%, ${palette[2]} 0%, transparent 36%)`,
                    blur,
                    opacity: 0.88,
                    transform: `scale(${scale})`,
                    radius,
                })}
            />
            <div
                style={layerStyle({
                    inset: `${18 + accent * 12}% ${6 + accent * 10}% ${8 + accent * 14}% ${28 - accent * 12}%`,
                    background: `linear-gradient(135deg, rgba(255,255,255,${0.22 + borderOpacity}) 0%, rgba(255,255,255,0.02) 100%)`,
                    blur: blur * 0.55,
                    opacity: 0.72,
                    transform: 'rotate(-8deg)',
                    radius,
                })}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: radius,
                    border: `1px solid rgba(255,255,255,${borderOpacity})`,
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                }}
            />
        </div>
    );
};

export default ShapeBlur;
