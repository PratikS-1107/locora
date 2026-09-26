import React, { useEffect, useRef } from 'react';

/**
 * Ravine — React Bits Pro Component
 * A ray-marched flight down an endless monochrome canyon,
 * its walls shaded by how far each ray had to travel.
 *
 * @param {Object} props
 * @param {number} [props.speed=0.7] - Speed of camera flight along canyon
 * @param {number} [props.canyonWidth=1.2] - Width of the canyon corridor
 * @param {number} [props.canyonDepth=1.3] - Height & dramatic scale of canyon walls
 * @param {number} [props.fogDensity=1.0] - Fog and distance-shading attenuation
 * @param {boolean} [props.interactive=true] - Pointer tracking camera parallax
 * @param {boolean} [props.monochrome=true] - Monochrome obsidian/silver shading
 * @param {string} [props.tint='#2dd4bf'] - Subtle accent tint for horizon glow
 * @param {string} [props.className=''] - Optional CSS class
 * @param {React.CSSProperties} [props.style={}] - Optional inline styles
 * @param {React.ReactNode} [props.children] - Optional overlay content
 */
export const Ravine = ({
  speed = 0.7,
  canyonWidth = 1.2,
  canyonDepth = 1.3,
  fogDensity = 1.0,
  interactive = true,
  monochrome = true,
  tint = '#2dd4bf',
  className = '',
  style = {},
  children
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameIdRef = useRef(null);
  const isVisibleRef = useRef(true);

  // Parse hex tint color to RGB normalized vec3
  const hexToRgb = (hex) => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });

    if (!gl) {
      console.warn('WebGL not supported for Ravine component');
      return;
    }

    // Vertex Shader (Full-screen quad)
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Ray-marched Monochrome Canyon Fragment Shader
    const fsSource = `
      precision highp float;

      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_canyon_width;
      uniform float u_canyon_depth;
      uniform float u_fog_density;
      uniform float u_monochrome;
      uniform vec3 u_tint_color;

      #define MAX_STEPS 88
      #define MAX_DIST 42.0
      #define SURF_DIST 0.003

      // Pseudo-random & FBM
      float hash(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(cos(0.55), sin(0.55), -sin(0.55), cos(0.55));
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = rot * p * 2.05 + vec2(17.13);
          a *= 0.5;
        }
        return v;
      }

      // Smooth curving path through canyon
      vec2 getCanyonPath(float z) {
        float x = sin(z * 0.08) * 3.2 + sin(z * 0.025) * 5.0;
        float y = cos(z * 0.05) * 0.9 + sin(z * 0.018) * 1.4;
        return vec2(x, y);
      }

      // Canyon signed distance field
      float map(vec3 p) {
        vec2 pathCenter = getCanyonPath(p.z);
        float dx = p.x - pathCenter.x;
        float dy = p.y - pathCenter.y;

        // Distance from canyon center line
        float distFromCenter = abs(dx) / u_canyon_width;

        // V-shaped canyon corridor opening upwards
        float wallProfile = smoothstep(0.35, 3.2, distFromCenter);
        float baseHeight = wallProfile * 4.8 * u_canyon_depth;

        // Geological strata and cliff ridges
        float strata = sin(p.y * 4.5 + fbm(p.xz * 0.25) * 2.8) * 0.16;
        float rockNoise = fbm(vec2(p.z * 0.28, p.y * 0.45 + p.x * 0.22)) * 1.5;
        float microRelief = noise(vec2(p.z * 1.4, p.y * 1.8 + p.x * 0.9)) * 0.22;

        float terrainSurface = (baseHeight + rockNoise + strata + microRelief) - 1.35;
        return dy - terrainSurface;
      }

      // Normal estimation for surface lighting
      vec3 calcNormal(vec3 p, float d) {
        float e = max(0.002, d * 0.5);
        vec2 h = vec2(e, 0.0);
        return normalize(vec3(
          map(p + h.xyy) - map(p - h.xyy),
          map(p + h.yxy) - map(p - h.yxy),
          map(p + h.yyx) - map(p - h.yyx)
        ));
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

        // Camera flight setup
        float time = u_time * u_speed * 3.2;
        vec2 camPath = getCanyonPath(time);
        vec3 ro = vec3(camPath.x, camPath.y + 0.35, time);

        // Lookahead point with mouse parallax tilt
        float lookAhead = 3.5;
        vec2 targetPath = getCanyonPath(time + lookAhead);
        vec3 lookAt = vec3(
          targetPath.x + u_mouse.x * 1.5,
          targetPath.y + 0.35 + u_mouse.y * 0.9,
          time + lookAhead
        );

        vec3 forward = normalize(lookAt - ro);
        vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
        vec3 up = cross(right, forward);

        // Ray direction
        vec3 rd = normalize(forward + uv.x * right + uv.y * up);

        // Raymarching loop
        float t = 0.08;
        float d = 0.0;
        int hitStep = 0;
        float hit = 0.0;

        for (int i = 0; i < MAX_STEPS; i++) {
          vec3 p = ro + rd * t;
          d = map(p);
          if (d < SURF_DIST * (1.0 + t * 0.04)) {
            hit = 1.0;
            hitStep = i;
            break;
          }
          t += d * 0.68;
          if (t >= MAX_DIST) break;
        }

        // Shading purely driven by ray travel distance
        vec3 color;
        float travelFraction = clamp(t / MAX_DIST, 0.0, 1.0);

        if (hit > 0.5) {
          vec3 p = ro + rd * t;
          vec3 n = calcNormal(p, d);

          // Ray-distance monochrome gradient:
          // Near surfaces = dark obsidian/slate
          // Far canyon walls = illuminated silver/mist
          float depthFactor = pow(travelFraction, 0.85);

          // Subtle directional rim light on cliff edges
          vec3 lightDir = normalize(vec3(0.2, 0.8, -0.5));
          float diff = clamp(dot(n, lightDir), 0.0, 1.0);
          float rim = pow(1.0 - max(0.0, dot(-rd, n)), 3.0);

          // Ambient occlusion from ray steps taken
          float ao = clamp(1.0 - float(hitStep) / float(MAX_STEPS), 0.25, 1.0);

          // Sedimentary banding contrast
          float strataBanding = sin(p.y * 9.0) * 0.04;

          // Pure monochrome shading value
          float monoShade = mix(0.04, 0.92, depthFactor);
          monoShade += diff * 0.18 + rim * 0.25 + strataBanding;
          monoShade *= ao;

          // Base monochrome palette
          vec3 darkCanyon = vec3(0.03, 0.04, 0.06);
          vec3 midCanyon = vec3(0.25, 0.28, 0.33);
          vec3 brightMist = vec3(0.88, 0.90, 0.94);

          vec3 rockColor = mix(darkCanyon, midCanyon, smoothstep(0.0, 0.5, depthFactor));
          rockColor = mix(rockColor, brightMist, smoothstep(0.4, 1.0, depthFactor));
          rockColor += vec3(rim * 0.15);

          // Optional subtle accent glow from project palette
          if (u_monochrome < 0.5) {
            rockColor = mix(rockColor, u_tint_color, depthFactor * 0.35);
          }

          // Atmospheric fog blending into distance
          float fog = 1.0 - exp(-pow(t * 0.065 * u_fog_density, 2.0));
          vec3 horizonFog = mix(vec3(0.03, 0.04, 0.07), vec3(0.12, 0.15, 0.20), uv.y * 0.5 + 0.5);
          horizonFog += u_tint_color * 0.08 * (1.0 - uv.y);

          color = mix(rockColor, horizonFog, fog);
        } else {
          // Atmospheric sky gradient along canyon vanishing horizon
          float horizonGlow = exp(-abs(uv.y - 0.05) * 4.0);
          vec3 skyDark = vec3(0.02, 0.03, 0.05);
          vec3 skyMid = vec3(0.14, 0.17, 0.22);
          vec3 horizon = mix(skyDark, skyMid, horizonGlow);
          horizon += u_tint_color * (horizonGlow * 0.15);
          color = horizon;
        }

        // Vignette effect for cinematic presentation
        vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
        float vignette = vigUv.x * vigUv.y * (1.0 - vigUv.x) * (1.0 - vigUv.y);
        vignette = clamp(pow(16.0 * vignette, 0.35), 0.0, 1.0);
        color *= vignette;

        // Subtle film grain
        float grain = (hash(gl_FragCoord.xy + fract(u_time * 10.0)) - 0.5) * 0.035;
        color += vec3(grain);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Compile helper
    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    );

    const aPositionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uSpeedLoc = gl.getUniformLocation(program, 'u_speed');
    const uCanyonWidthLoc = gl.getUniformLocation(program, 'u_canyon_width');
    const uCanyonDepthLoc = gl.getUniformLocation(program, 'u_canyon_depth');
    const uFogDensityLoc = gl.getUniformLocation(program, 'u_fog_density');
    const uMonochromeLoc = gl.getUniformLocation(program, 'u_monochrome');
    const uTintColorLoc = gl.getUniformLocation(program, 'u_tint_color');

    // Resize handling with DPR limit for buttery smooth FPS
    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      const displayWidth = Math.floor(width * dpr);
      const displayHeight = Math.floor(height * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);
    resize();

    // Intersection observer to pause rendering when offscreen
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisibleRef.current = entry.isIntersecting;
      });
    }, { threshold: 0.05 });
    intersectionObserver.observe(canvas);

    // Mouse tracking for parallax
    const handleMouseMove = (e) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = Math.max(-1, Math.min(1, nx));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, ny));
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Animation Render Loop
    const startTime = performance.now();
    const tintRgb = hexToRgb(tint);

    const render = (now) => {
      if (isVisibleRef.current) {
        const elapsed = (now - startTime) * 0.001;

        // Smooth mouse damping
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

        gl.useProgram(program);
        gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
        gl.uniform1f(uTimeLoc, elapsed);
        gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);
        gl.uniform1f(uSpeedLoc, speed);
        gl.uniform1f(uCanyonWidthLoc, canyonWidth);
        gl.uniform1f(uCanyonDepthLoc, canyonDepth);
        gl.uniform1f(uFogDensityLoc, fogDensity);
        gl.uniform1f(uMonochromeLoc, monochrome ? 1.0 : 0.0);
        gl.uniform3f(uTintColorLoc, tintRgb[0], tintRgb[1], tintRgb[2]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      if (gl) {
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      }
    };
  }, [speed, canyonWidth, canyonDepth, fogDensity, interactive, monochrome, tint]);

  return (
    <div
      ref={containerRef}
      className={`ravine-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#080b11',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none'
        }}
      />
      {children && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%'
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Ravine;
