import { useEffect, useRef } from "react"
import type { BgColor, BgMode } from "@/domain"

function FlowField({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("webgl")
    if (!ctx) return
    const gl = ctx

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    const vs = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `
    const fs = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 mouse = u_mouse / u_resolution.xy;
        float n = snoise(vec3(uv * 2.5, u_time * 0.12));
        float n2 = snoise(vec3(uv * 5.0 + mouse, u_time * 0.2));
        vec3 c1 = vec3(0.02, 0.02, 0.06);
        vec3 c2 = vec3(0.0, 0.55, 0.65);
        vec3 c3 = vec3(0.72, 0.16, 0.87);
        vec3 col = mix(c1, c2, smoothstep(-0.5, 1.0, n));
        col = mix(col, c3, smoothstep(0.3, 0.9, n2) * 0.25);
        gl_FragColor = vec4(col, 1.0);
      }
    `

    function createShader(type: number, source: string) {
      const s = gl.createShader(type)!
      gl.shaderSource(s, source)
      gl.compileShader(s)
      return s
    }
    function createProgram(vsSrc: string, fsSrc: string) {
      const p = gl.createProgram()!
      gl.attachShader(p, createShader(gl.VERTEX_SHADER, vsSrc))
      gl.attachShader(p, createShader(gl.FRAGMENT_SHADER, fsSrc))
      gl.linkProgram(p)
      return p
    }

    const program = createProgram(vs, fs)
    const positionLoc = gl.getAttribLocation(program, "position")
    const resolutionLoc = gl.getUniformLocation(program, "u_resolution")
    const timeLoc = gl.getUniformLocation(program, "u_time")
    const mouseLoc = gl.getUniformLocation(program, "u_mouse")

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 }
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = canvas.height - e.clientY
    }
    window.addEventListener("mousemove", onMove)

    let raf = 0
    const start = performance.now()
    const render = () => {
      const time = (performance.now() - start) / 1000
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(positionLoc)
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, time)
      gl.uniform2f(mouseLoc, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity: active ? 1 : 0 }}
    />
  )
}

function RainOnGlass({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    interface Drop {
      x: number
      y: number
      r: number
      speed: number
      len: number
    }
    const drops: Drop[] = []
    for (let i = 0; i < 80; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 4 + 2,
        len: Math.random() * 15 + 5,
      })
    }

    let raf = 0
    const draw = () => {
      ctx.fillStyle = "rgba(5, 5, 16, 0.35)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = "rgba(136, 153, 170, 0.25)"
      ctx.lineWidth = 1
      for (const d of drops) {
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x, d.y + d.len)
        ctx.stroke()
        d.y += d.speed
        if (d.y > canvas.height) {
          d.y = -d.len
          d.x = Math.random() * canvas.width
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(raf)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity: active ? 1 : 0 }}
    />
  )
}

function SolidBg({ color }: { color: BgColor }) {
  return (
    <div
      className="fixed inset-0 -z-10 h-full w-full transition-colors duration-500"
      style={{ backgroundColor: color }}
    />
  )
}

export function Background({ mode, color }: { mode: BgMode; color: BgColor }) {
  return (
    <>
      <FlowField active={mode === "flow"} />
      <RainOnGlass active={mode === "rain"} />
      {mode === "solid" && <SolidBg color={color} />}
    </>
  )
}
