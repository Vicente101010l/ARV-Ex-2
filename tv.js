function playSound(id) {
  const s = document.getElementById(id);
  if (!s) return;
  s.currentTime = 0;
  s.play().catch(() => {});
}

const CRT_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CRT_FRAG = `
uniform sampler2D map;
uniform sampler2D osd;
uniform float time;
uniform float noise;
uniform float osdAlpha;
varying vec2 vUv;

float rnd(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float r = dot(uv, uv);
  uv *= 1.0 + 0.045 * r;
  if (abs(uv.x) > 1.0 || abs(uv.y) > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 t = uv * 0.5 + 0.5;
  float ab = 0.0018;
  vec3 c;
  c.r = texture2D(map, t + vec2(ab, 0.0)).r;
  c.g = texture2D(map, t).g;
  c.b = texture2D(map, t - vec2(ab, 0.0)).b;
  c *= 0.9 + 0.1 * sin(t.y * 270.0 * 3.14159);
  c *= 0.96 + 0.04 * sin(time * 60.0);
  float n = rnd(floor(t * vec2(360.0, 200.0)));
  c = mix(c, vec3(n) * 0.9, noise);
  c *= 1.0 - 0.5 * r;
  vec4 o = texture2D(osd, t);
  c = mix(c, o.rgb, o.a * osdAlpha);
  gl_FragColor = vec4(c, 1.0);
}
`;

AFRAME.registerComponent('crt-tv', {
  schema: {
    width: { default: 1.6 },
    height: { default: 0.9 },
    semSinal: { default: 'SEM SINAL' },
    semSinalLegenda: { default: '' }
  },

  init() {
    this.current = -1;
    this.noiseHold = 0;
    this.osdTimer = Infinity;
    this.osdAlpha = 1;

    this.osdCanvas = document.createElement('canvas');
    this.osdCanvas.width = 1024;
    this.osdCanvas.height = 576;
    this.osdTexture = new THREE.CanvasTexture(this.osdCanvas);
    this.osdTexture.colorSpace = THREE.NoColorSpace;

    this.blank = new THREE.DataTexture(new Uint8Array([20, 20, 20, 255]), 1, 1);
    this.blank.needsUpdate = true;
    this.blank.colorSpace = THREE.NoColorSpace;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: this.blank },
        osd: { value: this.osdTexture },
        time: { value: 0 },
        noise: { value: 1 },
        osdAlpha: { value: 1 }
      },
      vertexShader: CRT_VERT,
      fragmentShader: CRT_FRAG
    });

    this.el.setObject3D('mesh', new THREE.Mesh(new THREE.PlaneGeometry(this.data.width, this.data.height), this.material));

    this.channels = [...document.querySelectorAll('.canal')].map((src) => {
      const isVideo = src.tagName === 'VIDEO';
      const texture = isVideo ? new THREE.VideoTexture(src) : new THREE.Texture(src);
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      return {
        src,
        texture,
        isVideo,
        title: src.dataset.titulo,
        caption: src.dataset.legenda
      };
    });

    this.drawOsd(this.data.semSinal, this.data.semSinalLegenda, false);
  },

  refreshButtons() {
    document.querySelectorAll('[tv-button]').forEach((b) => {
      const comp = b.components['tv-button'];
      if (comp) comp.refresh();
    });
  },

  drawOsd(line1, line2, showChannel, channelNumber) {
    const ctx = this.osdCanvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 576);
    ctx.shadowColor = '#7dff9a';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#9dffb0';
    ctx.textBaseline = 'alphabetic';
    if (showChannel) {
      ctx.font = 'bold 64px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CANAL ' + channelNumber, 48, 96);
      ctx.font = 'bold 40px "Courier New", monospace';
      ctx.fillText(line1, 48, 520);
      ctx.font = '26px "Courier New", monospace';
      ctx.fillText(line2, 48, 556, 928);
    } else {
      ctx.font = 'bold 56px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(line1, 512, 280);
      ctx.font = '30px "Courier New", monospace';
      ctx.fillText(line2, 512, 340);
    }
    this.osdTexture.needsUpdate = true;
  },

  setChannel(i) {
    if (i === this.current || !this.channels[i]) return;
    const prev = this.channels[this.current];
    if (prev && prev.isVideo) prev.src.pause();
    this.current = i;
    const ch = this.channels[i];
    playSound('som-estatica');
    this.noiseHold = 0.45;
    this.material.uniforms.map.value = ch.texture;
    if (ch.isVideo) {
      ch.src.currentTime = 0;
      ch.src.play().catch(() => {});
    }
    this.drawOsd(ch.title, ch.caption, true, i + 1);
    this.osdAlpha = 1;
    this.osdTimer = 4;
    this.refreshButtons();
  },

  currentVideo() {
    const ch = this.channels[this.current];
    return ch && ch.isVideo ? ch.src : null;
  },

  isVideoPlaying() {
    const v = this.currentVideo();
    return !!v && !v.paused;
  },

  togglePlay() {
    const v = this.currentVideo();
    if (!v) return false;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    this.refreshButtons();
    return true;
  },

  tick(time, delta) {
    const dt = delta / 1000;
    const u = this.material.uniforms;
    u.time.value = (time / 1000) % 100;
    if (this.noiseHold > 0) {
      this.noiseHold -= dt;
      u.noise.value = this.noiseHold > 0 ? Math.min(1, this.noiseHold / 0.45 + 0.1) : 0;
    } else {
      u.noise.value = this.current < 0 ? 0.55 : 0;
    }
    if (this.osdTimer !== Infinity && this.osdTimer > 0) {
      this.osdTimer -= dt;
      this.osdAlpha = Math.max(0, Math.min(1, this.osdTimer));
    }
    u.osdAlpha.value = this.osdAlpha;
  }
});

const BUTTON_STATES = {
  idle: { color: '#3a3632', emissive: '#000000' },
  hover: { color: '#6a6054', emissive: '#3a2208' },
  pressed: { color: '#8a5a1e', emissive: '#7a4208' }
};

AFRAME.registerComponent('tv-button', {
  schema: {
    kind: { default: 'channel' },
    channel: { default: 0 },
    tv: { default: '#tv' },
    playLabel: { default: '' },
    pauseLabel: { default: '' }
  },

  init() {
    this.hovered = false;
    this.sources = new Set();
    this.pressedUntil = 0;
    this.body = this.el.querySelector('.botao');
    this.labelEl = this.el.querySelector('.rotulo');
    this.lamp = this.el.querySelector('.luz');
    this.restY = this.body.object3D.position.y;

    this.body.addEventListener('mouseenter', () => this.setHover(true));
    this.body.addEventListener('mouseleave', () => this.setHover(false));
    this.body.addEventListener('click', () => this.press());
    this.el.addEventListener('loaded', () => this.refresh());
  },

  getTv() {
    const el = document.querySelector(this.data.tv);
    return el && el.components['crt-tv'];
  },

  isActive() {
    const tv = this.getTv();
    if (!tv) return false;
    if (this.data.kind === 'channel') return tv.current === this.data.channel;
    return tv.isVideoPlaying();
  },

  isEnabled() {
    if (this.data.kind === 'channel') return true;
    const tv = this.getTv();
    return !!tv && !!tv.currentVideo();
  },

  setHover(v, source) {
    const key = source || 'ray';
    if (v) this.sources.add(key);
    else this.sources.delete(key);
    const now = this.sources.size > 0;
    if (this.hovered === now) return;
    this.hovered = now;
    if (now && this.isEnabled()) playSound('som-hover');
    this.refresh();
  },

  press() {
    if (!this.isEnabled()) return;
    const tv = this.getTv();
    if (!tv) return;
    playSound('som-clique');
    this.pressedUntil = performance.now() + 180;
    if (this.data.kind === 'channel') tv.setChannel(this.data.channel);
    else tv.togglePlay();
    this.refresh();
  },

  refresh() {
    const mesh = this.body.getObject3D('mesh');
    if (!mesh) return;
    const pressed = performance.now() < this.pressedUntil;
    const active = this.isActive();
    const enabled = this.isEnabled();
    let state = 'idle';
    if (pressed) state = 'pressed';
    else if (this.hovered && enabled) state = 'hover';
    const look = BUTTON_STATES[state];
    mesh.material.color.set(look.color);
    mesh.material.emissive.set(active && state === 'idle' ? '#2a1804' : look.emissive);
    this.body.object3D.position.y = pressed ? this.restY - 0.016 : state === 'hover' ? this.restY + 0.004 : this.restY;

    const lampMesh = this.lamp.getObject3D('mesh');
    if (lampMesh) {
      lampMesh.material.emissive.set(active ? '#ff9a1f' : '#000000');
      lampMesh.material.color.set(active ? '#ffb347' : '#2a1a0a');
    }

    const tint = !enabled ? '#6b6258' : active ? '#ffb347' : '#e8dcc6';
    this.labelEl.setAttribute('material', 'color', tint);
    if (this.data.kind === 'play') {
      this.labelEl.setAttribute('material', 'src', active ? this.data.pauseLabel : this.data.playLabel);
    }
  },

  tick() {
    if (this.pressedUntil && performance.now() > this.pressedUntil) {
      this.pressedUntil = 0;
      this.refresh();
    }
  }
});

AFRAME.registerComponent('hand-poke', {
  schema: {
    reach: { default: 0.07 },
    cooldown: { default: 500 }
  },

  init() {
    this.tip = new THREE.Vector3();
    this.local = new THREE.Vector3();
    this.lastPress = new Map();
    this.lastDy = new Map();
  },

  tick(time) {
    const htc = this.el.components['hand-tracking-controls'];
    if (!htc || !htc.hasPoses) {
      this.lastDy.forEach((v, comp) => comp.setHover(false, this.el.id));
      this.lastDy.clear();
      return;
    }
    this.tip.copy(htc.indexTipPosition);
    this.el.object3D.localToWorld(this.tip);

    document.querySelectorAll('[tv-button]').forEach((b) => {
      const comp = b.components['tv-button'];
      if (!comp || !comp.body.object3D) return;
      this.local.copy(this.tip);
      comp.body.object3D.worldToLocal(this.local);
      const inside = Math.abs(this.local.x) < 0.085 && Math.abs(this.local.z) < 0.06;
      const dy = this.local.y - comp.restY;
      const near = inside && dy < this.data.reach && dy > -0.05;
      comp.setHover(near, this.el.id);
      const prev = this.lastDy.get(comp);
      const last = this.lastPress.get(comp) || 0;
      if (near && prev !== undefined && prev >= 0.012 && dy < 0.012 && time - last > this.data.cooldown) {
        this.lastPress.set(comp, time);
        comp.press();
      }
      this.lastDy.set(comp, inside ? dy : undefined);
    });
  }
});
