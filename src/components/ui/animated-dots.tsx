"use client";

import React, { useEffect, useRef } from "react";

type DotColor = [
  string,
  number,
  number,
  number,
];

interface AnimatedDotsProps {
  dotsNum?: number;
  dotRadius?: number;
  dotSpacing?: number;
  speedRange?: [number, number];
  backgroundColor?: string;
  opacity?: number;
  blendMode?: GlobalCompositeOperation;
  fullScreen?: boolean;
  className?: string;
  colors?: DotColor[];
}

const DEFAULT_COLORS: DotColor[] = [
  ["red", 255, 69, 58],
  ["orange", 255, 149, 0],
  ["yellow", 255, 214, 10],
  ["green", 52, 199, 89],
  ["mint", 0, 199, 190],
  ["teal", 48, 176, 199],
  ["blue", 0, 122, 255],
  ["indigo", 88, 86, 214],
  ["purple", 175, 82, 222],
  ["pink", 255, 45, 85],
  ["rose", 255, 100, 130],
  ["lime", 164, 255, 46],
  ["aqua", 46, 255, 220],
  ["sky", 100, 200, 255],
  ["violet", 205, 150, 255],
  ["gold", 255, 215, 0],
];

export const AnimatedDots: React.FC<AnimatedDotsProps> = ({
  dotsNum = 60,
  dotRadius = 10,
  dotSpacing = 0,
  speedRange = [1, 4],
  backgroundColor = "transparent",
  opacity = 1,
  blendMode = "normal",
  fullScreen = true,
  className = "",
  colors = DEFAULT_COLORS,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const TWO_PI = 2 * Math.PI;
    let width = fullScreen ? window.innerWidth : canvas.offsetWidth;
    let height = fullScreen ? window.innerHeight : canvas.offsetHeight;

    class Dot {
      index: number;
      velocity: number;
      randomVelocity: number;
      randomColor: number;
      radius: number;
      x: number;
      y: number;

      constructor(index: number) {
        this.index = index;
        this.velocity = 0;
        this.radius = dotRadius;
        this.randomVelocity =
          Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
        this.randomColor = Math.round(Math.random() * (colors.length - 1));
        const laneWidth = width / Math.max(dotsNum, 1);
        const laneStart = laneWidth * index;
        const lanePadding = Math.min(dotSpacing, Math.max(laneWidth / 4, 0));
        const minX = laneStart + this.radius + lanePadding;
        const maxX = laneStart + laneWidth - this.radius - lanePadding;

        this.x = maxX > minX
          ? Math.random() * (maxX - minX) + minX
          : laneStart + laneWidth / 2;
        this.y = -this.radius;
      }

      draw() {
        this.velocity += this.randomVelocity;
        const colorIncrement =
          255 - Math.round(this.velocity * (255 / (height + this.radius)));

        ctx.fillStyle = this.updateColor(colors[this.randomColor], colorIncrement);
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = blendMode;

        if (this.velocity >= height + this.radius) {
          this.velocity = 0;
          this.randomColor = Math.round(Math.random() * (colors.length - 1));
          this.randomVelocity =
            Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
        }

        this.y = -this.radius + this.velocity;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, TWO_PI, false);
        ctx.fill();
      }

      updateColor(selectedColor: DotColor, increment: number) {
        let [type, r, g, b] = selectedColor;

        if (type === "red") r = increment;
        else if (type === "green") g = increment;
        else if (type === "blue") b = increment;

        return `rgba(${r}, ${g}, ${b}, 1)`;
      }
    }

    const createDots = () => {
      dotsRef.current = [];
      for (let index = 0; index < dotsNum; index += 1) {
        dotsRef.current.push(new Dot(index));
      }
    };

    const resizeCanvas = () => {
      width = fullScreen ? window.innerWidth : canvas.offsetWidth;
      height = fullScreen ? window.innerHeight : canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      createDots();
    };

    const draw = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      for (const dot of dotsRef.current) {
        dot.draw();
      }

      animationRef.current = window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    draw();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    dotsNum,
    dotRadius,
    colors,
    dotSpacing,
    speedRange,
    backgroundColor,
    opacity,
    blendMode,
    fullScreen,
  ]);

  return (
    <div
      className={`relative ${fullScreen ? "h-screen w-screen" : ""} ${className}`}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};

export default AnimatedDots;
