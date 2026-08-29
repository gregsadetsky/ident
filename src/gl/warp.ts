import type { Deflect } from "../core/presets";

// scan-deflection pass: for each output pixel, bend the sampling coordinate
// through the deflection chain (sweep lag -> keystone -> zoom/spin -> wobble/flag),
// then read the mark texture there. persistence = max(new, prev*decay) via ping-pong.
const VS = `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;
const FS = `precision highp float; varying vec2 vUv;
uniform sampler2D uTex, uPrev; uniform float uTime, uDecay;
uniform vec2 uD, uZ; uniform float uRot, uPersp, uTau, uAmpX, uFreqX, uRateX, uAmpY, uFreqY, uRateY, uFlag;
vec4 at(vec2 q){ if(q.x<0.||q.x>1.||q.y<0.||q.y>1.) return vec4(0.); return texture2D(uTex,q); }
void main(){
  vec2 p = vUv; float t = uTime;
  float y = p.y;
  if(uTau>0.002){ float k = 1.0 - uTau*(1.0-exp(-1.0/uTau)); y = (p.y - uTau*(1.0-exp(-p.y/uTau)))/k; }
  vec2 q = vec2(p.x, y);
  float s = max(1.0 + uPersp*(q.y-0.5)*2.0, 0.05);
  q.x = (q.x-0.5)*s + 0.5;
  q -= 0.5;
  q = mat2(cos(uRot),-sin(uRot),sin(uRot),cos(uRot))*q;
  q /= max(uZ, vec2(0.02));
  q += 0.5;
  q.x += uAmpX*sin(6.28318*(uFreqX*p.y + uRateX*t));
  q.y += uAmpY*sin(6.28318*(uFreqY*p.x + uRateY*t));
  q.y += uFlag * p.x * sin(6.28318*(2.0*p.x - 1.5*t));
  q -= uD;
  vec4 c = at(q);
  vec4 prev = texture2D(uPrev, vUv);
  // 8-bit storage rounds 1/255*decay back up to 1/255: without this bias trails never fully die
  gl_FragColor = max(c, max(prev*uDecay - 1.5/255.0, 0.0));
}`;
const COPY = `precision highp float; varying vec2 vUv; uniform sampler2D uTex; void main(){ gl_FragColor = texture2D(uTex, vUv); }`;

export class Warp {
  readonly canvas = document.createElement("canvas");
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram; private copy: WebGLProgram;
  private tex: WebGLTexture; private fbo: [WebGLFramebuffer, WebGLFramebuffer]; private fboTex: [WebGLTexture, WebGLTexture];
  private ping = 0; private u: Record<string, WebGLUniformLocation | null> = {};
  private w = 0; private h = 0;

  constructor() {
    const gl = this.canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true })!;
    this.gl = gl;
    this.prog = program(gl, VS, FS); this.copy = program(gl, VS, COPY);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const p of [this.prog, this.copy]) { const a = gl.getAttribLocation(p, "aPos"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
    this.tex = mkTex(gl);
    this.fboTex = [mkTex(gl), mkTex(gl)];
    this.fbo = [gl.createFramebuffer()!, gl.createFramebuffer()!];
    for (const n of ["uTex", "uPrev", "uTime", "uDecay", "uD", "uZ", "uRot", "uPersp", "uTau", "uAmpX", "uFreqX", "uRateX", "uAmpY", "uFreqY", "uRateY", "uFlag"]) this.u[n] = gl.getUniformLocation(this.prog, n);
  }

  // upload the static mark (also resizes buffers to match)
  setSource(src: HTMLCanvasElement) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    if (src.width !== this.w || src.height !== this.h) {
      this.w = this.canvas.width = src.width; this.h = this.canvas.height = src.height;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      for (let i = 0; i < 2; i++) {
        gl.bindTexture(gl.TEXTURE_2D, this.fboTex[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex[i], 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
  }

  // wipe phosphor persistence (both ping-pong buffers)
  clear() {
    const gl = this.gl;
    for (const f of this.fbo) { gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(d: Deflect, time: number, decay: number) {
    const gl = this.gl, u = this.u;
    const dst = this.ping, src = 1 - this.ping; this.ping = src;
    gl.viewport(0, 0, this.w, this.h);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(u.uTex, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fboTex[src]); gl.uniform1i(u.uPrev, 1);
    gl.uniform1f(u.uTime, time); gl.uniform1f(u.uDecay, decay);
    gl.uniform2f(u.uD, d.dx, -d.dy); gl.uniform2f(u.uZ, d.zx, d.zy);
    gl.uniform1f(u.uRot, d.rot); gl.uniform1f(u.uPersp, d.persp); gl.uniform1f(u.uTau, d.tau);
    gl.uniform1f(u.uAmpX, d.ampX); gl.uniform1f(u.uFreqX, d.freqX); gl.uniform1f(u.uRateX, d.rateX);
    gl.uniform1f(u.uAmpY, d.ampY); gl.uniform1f(u.uFreqY, d.freqY); gl.uniform1f(u.uRateY, d.rateY);
    gl.uniform1f(u.uFlag, d.flag);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[dst]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // blit to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.copy);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fboTex[dst]);
    gl.uniform1i(gl.getUniformLocation(this.copy, "uTex"), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

function mkTex(gl: WebGLRenderingContext) {
  const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function program(gl: WebGLRenderingContext, vs: string, fs: string) {
  const mk = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader"); return s; };
  const p = gl.createProgram()!; gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  return p;
}
