import { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────
   WebGL GPU-Accelerated Ambient Background
   Replaces CSS blur orbs with a fragment shader
   ───────────────────────────────────────────── */

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;

  // Soft radial gradient orb
  float orb(vec2 uv, vec2 center, float radius, float softness) {
    float d = length(uv - center);
    return smoothstep(radius, radius * softness, d);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Animate orb positions gently
    float t = u_time * 0.04;

    vec2 p1 = vec2(
      0.15 + sin(t * 0.7) * 0.06,
      0.85 + cos(t * 0.5) * 0.08
    );
    vec2 p2 = vec2(
      0.85 + cos(t * 0.6) * 0.05,
      0.15 + sin(t * 0.8) * 0.06
    );
    vec2 p3 = vec2(
      0.55 + sin(t * 0.5) * 0.07,
      0.50 + cos(t * 0.9) * 0.06
    );

    // Orb intensities — subtle
    float o1 = orb(uv, p1, 0.08, 0.15) * 0.12;
    float o2 = orb(uv, p2, 0.07, 0.12) * 0.10;
    float o3 = orb(uv, p3, 0.06, 0.10) * 0.08;

    // Brand blue palette
    vec3 c1 = vec3(0.0, 0.44, 0.95);  // #0070F3
    vec3 c2 = vec3(0.20, 0.57, 1.0);  // #3291FF
    vec3 c3 = vec3(0.02, 0.71, 0.83); // #06B6D4

    vec3 color = vec3(0.016, 0.016, 0.024); // --bg-root #040406
    color += c1 * o1;
    color += c2 * o2;
    color += c3 * o3;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function WebGLBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let active = true;
    let cleanup = null;

    const timer = setTimeout(() => {
      if (!active) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      });

      if (!gl) {
        console.warn('WebGL not available, falling back to CSS background');
        return;
      }

      // Compile shaders & program
      const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (!vs || !fs) return;

      const program = createProgram(gl, vs, fs);
      if (!program) return;

      // Full-screen quad
      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1,  -1, 1,
        -1,  1,  1, -1,   1, 1,
      ]), gl.STATIC_DRAW);

      const aPosition = gl.getAttribLocation(program, 'a_position');
      const uResolution = gl.getUniformLocation(program, 'u_resolution');
      const uTime = gl.getUniformLocation(program, 'u_time');

      let speedMultiplier = 1.0;
      const updateSettings = () => {
        const isEnabled = localStorage.getItem('webgl_enabled') !== 'false';
        if (canvas) {
          canvas.style.display = isEnabled ? 'block' : 'none';
        }
        const speedStr = localStorage.getItem('ambient_speed') || 'normal';
        speedMultiplier = speedStr === 'off' ? 0.0 : speedStr === 'slow' ? 0.35 : speedStr === 'fast' ? 2.0 : 1.0;
      };

      updateSettings();
      window.addEventListener('ambient_config_changed', updateSettings);

      // Resize handler
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        // On mobile use lower resolution for performance
        const isMobile = window.innerWidth < 768;
        dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      resize();
      window.addEventListener('resize', resize);

      // Render loop — uncapped for maximum smoothness
      let lastTime = 0;
      let accumulatedTime = 0;

      function render(now) {
        rafRef.current = requestAnimationFrame(render);

        const dt = now - (lastTime || now);
        lastTime = now;
        accumulatedTime += dt * 0.001 * speedMultiplier;

        gl.useProgram(program);

        gl.enableVertexAttribArray(aPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uTime, accumulatedTime);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      rafRef.current = requestAnimationFrame(render);

      cleanup = () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('ambient_config_changed', updateSettings);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(posBuffer);
      };
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
