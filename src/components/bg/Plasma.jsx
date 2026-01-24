import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 0.5, 0.2];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex300 = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment300 = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  o = vec4(0.0);
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;
  
  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
  
  float i = 0.0;
  float d = 0.0;
  float z = 0.0;
  float T = iTime * uSpeed * uDirection;
  vec3 O = vec3(0.0);
  vec3 p = vec3(0.0);
  vec3 S = vec3(0.0);

  for (vec2 r = iResolution.xy, Q; ++i < 60.; ) {
    p = z*normalize(vec3(C-.5*r,r.y)); 
    p.z -= 4.; 
    S = p;
    d = p.y-T;
    
    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05); 
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T)); 
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4;
    float signD = d >= 0.0 ? 1.0 : -1.0;
    float safeD = signD * max(abs(d), 1e-4);
    O += o.w/safeD*o.xyz;
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }
  
  o.xyz = tanh(O/1e4);
}

bool finite1(float x){ return !(isnan(x) || isinf(x)); }
vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);
  
  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));
  
  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`;

const vertex100 = `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment100 = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
varying vec2 vUv;

float tanh1(float x){
  float e = exp(2.0*x);
  return (e - 1.0) / (e + 1.0);
}

vec3 tanh1(vec3 x){
  return vec3(tanh1(x.x), tanh1(x.y), tanh1(x.z));
}

float finite1(float x){
  return (x == x && abs(x) < 1e20) ? 1.0 : 0.0;
}

vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) > 0.5 ? c.r : 0.0,
    finite1(c.g) > 0.5 ? c.g : 0.0,
    finite1(c.b) > 0.5 ? c.b : 0.0
  );
}

void mainImage(out vec4 o, vec2 C) {
  o = vec4(0.0);
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;
  
  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
  
  float i = 0.0;
  float d = 0.0;
  float z = 0.0;
  float T = iTime * uSpeed * uDirection;
  vec3 O = vec3(0.0);
  vec3 p = vec3(0.0);
  vec3 S = vec3(0.0);

  for (vec2 r = iResolution.xy, Q; ++i < 60.; ) {
    p = z*normalize(vec3(C-.5*r,r.y)); 
    p.z -= 4.; 
    S = p;
    d = p.y-T;
    
    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05); 
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T)); 
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4;
    float signD = d >= 0.0 ? 1.0 : -1.0;
    float safeD = signD * max(abs(d), 1e-4);
    O += o.w/safeD*o.xyz;
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }
  
  o.xyz = tanh1(O/1e4);
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);
  
  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));
  
  float alpha = length(rgb) * uOpacity;
  gl_FragColor = vec4(finalColor, alpha);
}`;

export const Plasma = ({
  color = '#ffffff',
  speed = 1,
  direction = 'forward',
  scale = 1,
  opacity = 1,
  mouseInteractive = true,
  maxDpr = 1.5,
  maxFps = 45,
  pauseWhenOffscreen = true
}) => {
  const containerRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    const deviceMemory = navigator.deviceMemory || 0;
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;
    const lowEnd = (deviceMemory && deviceMemory <= 4) || (hardwareConcurrency && hardwareConcurrency <= 4);
    const resolvedMaxDpr = lowEnd ? Math.min(maxDpr, 1) : maxDpr;
    const resolvedFps = lowEnd ? Math.min(maxFps, 30) : maxFps;
    const minFrameMs = resolvedFps > 0 ? 1000 / resolvedFps : 0;

    const useCustomColor = color ? 1.0 : 0.0;
    const customColorRgb = color ? hexToRgb(color) : [1, 1, 1];

    const directionMultiplier = direction === 'reverse' ? -1.0 : 1.0;

    const supportsWebGL2 = (() => {
      try {
        const testCanvas = document.createElement('canvas');
        return !!testCanvas.getContext('webgl2');
      } catch {
        return false;
      }
    })();

    let renderer;
    try {
      renderer = new Renderer({
        webgl: supportsWebGL2 ? 2 : 1,
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, resolvedMaxDpr)
      });
    } catch (err) {
      console.warn('WebGL unavailable for Plasma', err);
      return;
    }
    const gl = renderer.gl;
    if (!gl) return;
    const canvas = gl.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    containerRef.current.appendChild(canvas);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: supportsWebGL2 ? vertex300 : vertex100,
      fragment: supportsWebGL2 ? fragment300 : fragment100,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: { value: new Float32Array(customColorRgb) },
        uUseCustomColor: { value: useCustomColor },
        uSpeed: { value: speed * 0.4 },
        uDirection: { value: directionMultiplier },
        uScale: { value: scale },
        uOpacity: { value: opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: mouseInteractive ? 1.0 : 0.0 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    const handleMouseMove = e => {
      if (!mouseInteractive) return;
      const rect = containerRef.current.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
      const mouseUniform = program.uniforms.uMouse.value;
      mouseUniform[0] = mousePos.current.x;
      mouseUniform[1] = mousePos.current.y;
    };

    if (mouseInteractive) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
    }

    const setSize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height);
      const res = program.uniforms.iResolution.value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(containerRef.current);
    setSize();

    let raf = 0;
    let running = false;
    let inView = !pauseWhenOffscreen;
    let lastTime = 0;
    const t0 = performance.now();

    const stop = () => {
      running = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const loop = t => {
      if (!running) return;
      if (minFrameMs > 0 && t - lastTime < minFrameMs) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastTime = t;
      let timeValue = (t - t0) * 0.001;
      if (direction === 'pingpong') {
        const pingpongDuration = 10;
        const segmentTime = timeValue % pingpongDuration;
        const isForward = Math.floor(timeValue / pingpongDuration) % 2 === 0;
        const u = segmentTime / pingpongDuration;
        const smooth = u * u * (3 - 2 * u);
        const pingpongTime = isForward ? smooth * pingpongDuration : (1 - smooth) * pingpongDuration;
        program.uniforms.uDirection.value = 1.0;
        program.uniforms.iTime.value = pingpongTime;
      } else {
        program.uniforms.iTime.value = timeValue;
      }
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    const updateRunState = () => {
      if (!pauseWhenOffscreen) return;
      const pageVisible = document.visibilityState !== 'hidden';
      if (inView && pageVisible) {
        start();
      } else {
        stop();
      }
    };

    let io;
    if (pauseWhenOffscreen && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => {
          inView = !!entry?.isIntersecting;
          updateRunState();
        },
        { threshold: 0.05 }
      );
      io.observe(containerRef.current);
    }

    const handleVisibility = () => updateRunState();
    if (pauseWhenOffscreen) {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    if (!pauseWhenOffscreen) {
      start();
    } else {
      updateRunState();
    }

    return () => {
      stop();
      io?.disconnect();
      ro.disconnect();
      if (mouseInteractive && containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      if (pauseWhenOffscreen) {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      try {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        containerRef.current?.removeChild(canvas);
      } catch {
        console.warn('Canvas already removed from container');
      }
    };
  }, [color, speed, direction, scale, opacity, mouseInteractive, maxDpr, maxFps, pauseWhenOffscreen]);

  return <div ref={containerRef} className="w-full h-full overflow-hidden relative" />;
};

export default Plasma;
