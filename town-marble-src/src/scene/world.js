import * as T from "three";
import { makeNameplates } from "./nameplates.js";
import { standingSlot, characterReactions } from "./character-state.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { BOARD, CHARACTERS, GROUPS, tilePoint } from "../../shared/data.js";
import {
  createFactory,
  makeCharacter,
  makeBuilding,
  makePark,
} from "./models.js";

const clamp = T.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);
const point = (index) => {
  const p = tilePoint(index);
  return new T.Vector3((p.x - 4) * 2.12, 0.43, (p.y - 4) * 2.12);
};
const turnToward = (a, b, t) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

function diceFace(value) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#eee1c8";
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 120, 120);
  const dots = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }[value];
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(
      33 + (dot % 3) * 31,
      33 + Math.floor(dot / 3) * 31,
      9.2,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#38577e";
    ctx.fill();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({ map: texture, roughness: 0.5 });
}
function diceRotation(value, yaw) {
  const normal = {
    1: [0, 1, 0],
    6: [0, -1, 0],
    2: [0, 0, 1],
    5: [0, 0, -1],
    3: [1, 0, 0],
    4: [-1, 0, 0],
  }[value];
  return new T.Quaternion()
    .setFromUnitVectors(new T.Vector3(...normal), new T.Vector3(0, 1, 0))
    .premultiply(
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw),
    );
}

export class MarbleWorld {
  constructor(
    host,
    {
      onMoving,
      onPhase,
      onCue,
      onError,
      onSelect,
      onQuality,
      onReaction,
      labelElements,
      actorElements,
    },
  ) {
    Object.assign(this, {
      host,
      onMoving,
      onPhase,
      onCue,
      onError,
      onSelect,
      onQuality,
      onReaction,
      labelElements,
      actorElements,
    });
    this.speed = 1;
    this.clockAnchor = performance.now();
    this.animationAnchor = this.clockAnchor;
    this.F = createFactory();
    this.actors = new Map();
    this.tiles = [];
    this.lots = [];
    this.effects = [];
    this.particles = [];
    this.scene = new T.Scene();
    this.target = new T.Vector3(0, 0.8, 0);
    this.desiredTarget = this.target.clone();
    this.yaw = 0.45;
    this.desiredYaw = 0.45;
    this.zoom = 1;
    this.desiredZoom = 1;
    this.follow = true;
    this.reduced = false;
    this.quality = "auto";
    this.lastTime = 0;
    this.lastFrame = 0;
    this.frameTimes = [];
    this.camera = new T.OrthographicCamera(-16, 16, 12, -12, 0.1, 150);
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.className = "world-canvas";
    this.renderer.domElement.setAttribute(
      "aria-label",
      "입체 게임판: 캐릭터와 건물이 움직이는 구름 위 세계",
    );
    host.prepend(this.renderer.domElement);
    this.contextLost = (e) => {
      e.preventDefault();
      onMoving(false);
      onError("입체 화면을 복구할 수 없어 간단한 화면으로 전환했어요.");
    };
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.scene.add(new T.HemisphereLight("#d8f6ff", "#cfb991", 1.65));
    const sun = new T.DirectionalLight("#fff0d7", 2.7);
    sun.position.set(-12, 24, 16);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, {
      left: -17,
      right: 17,
      top: 17,
      bottom: -17,
      near: 0.5,
      far: 70,
    });
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);
    this.sun = sun;
    this.buildWorld();
    this.buildDice();
    this.buildParticles();
    this.setPhase("idle");
    this.pick = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ray = new T.Raycaster();
      ray.setFromCamera(
        new T.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((event.clientY - rect.top) / rect.height) * 2,
        ),
        this.camera,
      );
      const hit = ray.ray.intersectPlane(
        new T.Plane(new T.Vector3(0, 1, 0), -0.43),
        new T.Vector3(),
      );
      if (!hit) return;
      const tile = BOARD.find((t) => {
        const p = point(t.index);
        return Math.abs(hit.x - p.x) < 1.04 && Math.abs(hit.z - p.z) < 1.04;
      });
      if (tile) onSelect(tile.index);
    };
    this.renderer.domElement.addEventListener("click", this.pick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.frame = requestAnimationFrame((t) => this.tick(t));
  }
  buildWorld() {
    const F = this.F,
      terrain = F.group(this.scene);
    F.box(terrain, "#a8d9c7", [0, -0.55, 0], [20.0, 0.95, 20.0]);
    F.box(terrain, "#f4df9e", [0, -0.2, 0], [19.95, 0.14, 19.95]);
    F.box(terrain, "#84bbac", [0, -1.13, 0], [18.7, 0.7, 18.7]);
    const underside = F.cylinder(
      terrain,
      "#c3b694",
      [0, -2.0, 0],
      [10.6, 2.2, 10.6],
      true,
    );
    underside.rotation.z = Math.PI;
    F.box(terrain, "#fff1d6", [0, -0.29, 0], [23.3, 0.35, 23.3]);
    F.batch(terrain);
    this.nameplates = makeNameplates(this.scene);
    this.park = makePark(F, this.scene);
    const platform = F.group(this.scene);
    BOARD.forEach((tile) => {
      const p = point(tile.index),
        corner = tile.index % 8 === 0;
      const base = F.box(
        platform,
        corner
          ? ["#eed7aa", "#abd9c7", "#fae0a0", "#c5b6e7"][tile.index / 8]
          : "#fff3d6",
        [p.x, 0.19, p.z],
        [2.02, 0.43, 2.02],
      );
      base.userData.tile = tile.index;
      const band = F.box(
        platform,
        tile.type === "city" ? GROUPS[tile.group] : "#e8c777",
        [p.x, 0.427, p.z - 0.75],
        [1.93, 0.035, 0.36],
      );
      const inset = F.box(
        platform,
        "#fff8e6",
        [p.x, 0.428, p.z + 0.32],
        [1.83, 0.022, 1.08],
      );
      this.tiles.push({ base, band, inset });
      const lot = F.group(this.scene, [p.x, 0.44, p.z]);
      this.lots.push({ root: lot, owner: null, level: -1 });
      if (tile.type === "city") this.replaceLot(tile.index, null, 0, false);
      else {
        const special = F.group(platform, [p.x, 0.45, p.z - 0.65]);
        special.scale.setScalar(0.64);
        if (tile.type === "card") {
          F.box(special, "#e7bd54", [0, 0.3, 0], [0.57, 0.56, 0.14]);
          F.ring(special, "#fff2b7", [0, 0.5, 0.09], 0.12, 0.03);
          F.box(
            special,
            "#fff2b7",
            [0.04, 0.3, 0.09],
            [0.05, 0.2, 0.05],
            false,
          );
        }
        if (tile.type === "island") {
          F.ball(special, "#e8cf96", [0, 0.09, 0], [0.65, 0.13, 0.5]);
          F.cylinder(special, "#ad8860", [0.2, 0.52, 0], [0.08, 0.88, 0.08]);
          for (let i = 0; i < 5; i++) {
            const leaf = F.ball(
              special,
              "#79bfa1",
              [
                0.2 + Math.cos(i * 1.26) * 0.27,
                0.99,
                Math.sin(i * 1.26) * 0.27,
              ],
              [0.4, 0.08, 0.18],
            );
            leaf.rotation.y = -i * 1.26;
          }
        }
        if (tile.type === "travel") {
          F.ball(special, "#fff2db", [0, 0.63, 0], [0.28, 0.62, 0.28]);
          F.cylinder(special, "#eaa9a6", [0, 1.2, 0], [0.29, 0.44, 0.29], true);
          F.ball(special, "#88c9de", [0, 0.76, 0.25], [0.14, 0.14, 0.03]);
          for (const x of [-0.28, 0.28])
            F.box(special, "#9eadd5", [x, 0.29, 0], [0.14, 0.4, 0.36]);
        }
        if (tile.type === "start") {
          F.cylinder(special, "#d0af6f", [-0.32, 0.75, 0], [0.035, 1.5, 0.035]);
          F.box(special, "#e4b675", [0.02, 1.3, 0], [0.68, 0.4, 0.05], false);
        }
        if (tile.type === "fundGet") {
          F.box(special, "#dda0ad", [0, 0.36, 0], [0.68, 0.68, 0.65]);
          F.box(special, "#f7df8b", [0, 0.37, 0.34], [0.1, 0.7, 0.04]);
          F.box(special, "#f7df8b", [0, 0.71, 0], [0.7, 0.07, 0.12]);
          F.ring(special, "#f7df8b", [0.13, 0.83, 0], 0.13, 0.04);
        }
        if (tile.type === "fundPay") {
          F.ball(special, "#efb1b5", [-0.1, 0.47, 0], [0.27, 0.3, 0.2]);
          F.ball(special, "#efb1b5", [0.16, 0.47, 0], [0.27, 0.3, 0.2]);
        }
      }
    });
    F.batch(platform);
    this.platform = platform;
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const cloud = F.group(this.scene, [
        Math.cos(i * 1.05) * 13.5,
        -1.9 + (i % 2) * 0.5,
        Math.sin(i * 1.05) * 12.6,
      ]);
      for (let j = 0; j < 4; j++)
        F.ball(
          cloud,
          "#fff5e7",
          [(j - 1.5) * 0.65, Math.sin(j * 2) * 0.24, 0],
          [1, 0.5 + (j % 2) * 0.25, 0.72],
        );
      F.batch(cloud);
      this.clouds.push({
        root: cloud,
        x: cloud.position.x,
        z: cloud.position.z,
      });
    }
    const ring = F.ring(this.scene, "#ffdc7c", [0, 0.49, 0], 0.68, 0.055);
    ring.rotation.x = -Math.PI / 2;
    this.activeRing = ring;
    const tileRing = F.box(
      this.scene,
      "#ffda75",
      [0, 0.46, 0],
      [2.07, 0.04, 2.07],
    );
    tileRing.visible = false;
    this.selectedRing = tileRing;
    this.renderer.shadowMap.needsUpdate = true;
  }
  replaceLot(index, owner, level, animate) {
    const lot = this.lots[index];
    for (const child of [...lot.root.children]) {
      this.releaseGeometry(child);
      lot.root.remove(child);
    }
    lot.owner = owner;
    lot.level = level;
    const color = owner
      ? CHARACTERS[
          this.state?.game?.players.find((p) => p.id === owner)?.character ?? 0
        ].color
      : GROUPS[BOARD[index].group];
    const building = makeBuilding(this.F, level, color, index);
    const p = point(index);
    building.position.set(0, 0, -0.65);
    building.scale.setScalar(level ? 0.62 : 0.42);
    lot.root.add(building);
    if (owner) {
      this.F.cylinder(
        lot.root,
        "#e3c58a",
        [-0.75, 0.39, -0.65],
        [0.025, 0.78, 0.025],
      );
      this.F.box(
        lot.root,
        color,
        [-0.63, 0.66, -0.65],
        [0.39, 0.23, 0.035],
        false,
      );
    }
    if (animate) {
      this.effects.push({
        type: "build",
        root: building,
        start: this.now(),
        scale: level ? 0.62 : 0.42,
        base: building.position.clone(),
      });
      building.scale.setScalar(0.01);
      building.position.y = 2.5;
      this.burst(p.clone().add(new T.Vector3(0, 1, 0)), 20, "#ffdb74");
      const actor = this.actors.get(owner);
      if (actor) actor.celebrateUntil = this.now() + 1300;
      this.focus(p, 1.27, 1500);
      this.setPhase("building");
      this.noMoveUntil = this.now() + 950;
      this.onCue({
        type: "build",
        title: level
          ? `${["", "별장", "빌딩", "호텔"][level]} 완성!`
          : "내 도시가 되었어요!",
        subtitle: BOARD[index].name,
        duration: 1600,
      });
    }
    this.renderer.shadowMap.needsUpdate = true;
  }
  buildDice() {
    const geometry = new RoundedBoxGeometry(2.3, 2.3, 2.3, 2, 0.18);
    this.diceMaterials = [3, 4, 1, 6, 2, 5].map(diceFace);
    this.dice = [-1, 1].map((side) => {
      const mesh = new T.Mesh(geometry, this.diceMaterials);
      mesh.position.set(side * 1.2, 2, 4.2);
      mesh.castShadow = false;
      mesh.visible = false;
      this.scene.add(mesh);
      return mesh;
    });
  }
  buildParticles() {
    const positions = new Float32Array(180 * 3),
      colors = new Float32Array(180 * 3);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage),
    );
    geometry.setAttribute(
      "color",
      new T.BufferAttribute(colors, 3).setUsage(T.DynamicDrawUsage),
    );
    geometry.setDrawRange(0, 0);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.4, "#fff");
    gradient.addColorStop(1, "#fff0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    this.sparkles = new T.Points(
      geometry,
      new T.PointsMaterial({
        size: 0.2,
        map: new T.CanvasTexture(canvas),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.sparkles.frustumCulled = false;
    this.scene.add(this.sparkles);
  }
  burst(position, count, color = "#fff0b8") {
    if (this.reduced || this.quality === "low") return;
    const tint = new T.Color(color);
    for (let i = 0; i < count && this.particles.length < 180; i++)
      this.particles.push({
        p: position.clone(),
        v: new T.Vector3(
          (Math.random() - 0.5) * 2.8,
          1 + Math.random() * 3,
          (Math.random() - 0.5) * 2.8,
        ),
        life: 0.4 + Math.random() * 0.6,
        tint,
      });
  }
  releaseGeometry(root) {
    const shared = new Set(this.F.geometries.values());
    root.traverse((node) => {
      if (node.isMesh && !shared.has(node.geometry)) node.geometry.dispose();
    });
  }
  now() {
    return (
      this.animationAnchor + (performance.now() - this.clockAnchor) * this.speed
    );
  }
  update(next) {
    const speed = [1, 1.5, 2].includes(next.speed) ? next.speed : 1;
    if (speed !== this.speed) {
      this.animationAnchor = this.now();
      this.clockAnchor = performance.now();
      this.speed = speed;
    }
    const previous = this.state;
    this.state = next;
    this.reduced = next.reduced;
    const game = next.game;
    const players =
      game?.players ||
      next.seats.map((s, i) => ({
        ...s,
        id: s.id || `preview-${i}`,
        position: [1, 9, 18, 27][i],
        out: false,
      }));
    for (const [id, rig] of this.actors)
      if (!players.some((p) => p.id === id)) {
        this.releaseGeometry(rig.root);
        rig.root.removeFromParent();
        rig.shadow.geometry.dispose();
        rig.shadow.material.dispose();
        rig.shadow.removeFromParent();
        this.actors.delete(id);
      }
    players.forEach((p, i) => {
      let rig = this.actors.get(p.id);
      if (!rig) {
        rig = makeCharacter(this.F, p.character);
        rig.root.traverse((node) => {
          if (node.isMesh) node.castShadow = false;
        });
        rig.id = p.id;
        rig.seat = i;
        rig.p = p;
        rig.shadow = new T.Mesh(
          new T.CircleGeometry(0.52, 24),
          new T.MeshBasicMaterial({
            color: "#355a64",
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
          }),
        );
        rig.shadow.rotation.x = -Math.PI / 2;
        this.scene.add(rig.shadow, rig.root);
        this.actors.set(p.id, rig);
      }
      rig.p = p;
      if (game?.startedAt !== previous?.game?.startedAt || !game) {
        rig.pendingReaction = null;
        rig.reactionUntil = 0;
      }
      rig.root.visible = !p.out;
      rig.shadow.visible = !p.out;
      const cluster =
        game?.players.filter(
          (other) => !other.out && other.position === p.position,
        ).length || 1;
      rig.scale = game
        ? standingSlot(cluster, 0).scale
        : p.character === next.previewCharacter
          ? 1.17
          : 0.96;
      if (!this.motion || this.motion.playerId !== p.id) {
        rig.walking = false;
        rig.root.position.copy(this.actorPoint(p.position, i, !!game));
        rig.root.rotation.y = 0.45;
      }
    });
    this.renderer.domElement.dataset.actors = String(this.actors.size);
    for (const reaction of characterReactions(previous?.game, game)) {
      const rig = this.actors.get(reaction.playerId);
      if (rig) rig.pendingReaction = reaction.kind;
    }
    if (game && previous?.game !== game) {
      for (const tile of BOARD)
        if (tile.type === "city") {
          const lot = game.properties[tile.index],
            old = this.lots[tile.index];
          if (old.owner !== lot.owner || old.level !== lot.level)
            this.replaceLot(
              tile.index,
              lot.owner,
              lot.level,
              !!previous?.game && !!lot.owner,
            );
        }
    }
    if (!game && previous?.game) {
      this.pendingCard = null;
      this.noMoveUntil = null;
      this.diceRoll = null;
      this.dice.forEach((die) => {
        die.visible = false;
      });
      for (const tile of BOARD)
        if (tile.type === "city") this.replaceLot(tile.index, null, 0, false);
      this.motion = null;
      this.setPhase("idle");
    }
    const isNewMotion =
      game?.motion && game.motion.id !== previous?.game?.motion?.id;
    const rolled =
      game &&
      previous?.game &&
      game.status === "playing" &&
      game.current === previous.game.current &&
      previous.game.phase === "roll" &&
      game.phase !== "roll" &&
      game.revision !== previous.game.revision &&
      game.dice;
    if (isNewMotion && previous?.game) {
      this.noMoveUntil = null;
      for (const actor of this.actors.values()) {
        actor.walking = false;
        actor.root.position.copy(
          this.actorPoint(actor.p.position, actor.seat, true),
        );
      }
      const start = this.now();
      const dice = rolled ? game.dice : null;
      this.motion = {
        ...game.motion,
        start: start + (dice && !this.reduced ? 1150 : 0),
        segments: game.motion.segments,
        segment: 0,
        step: 0,
      };
      this.setPhase(dice ? "dice" : "walking");
      if (dice) this.rollDice(dice);
      const rig = this.actors.get(game.motion.playerId);
      if (rig)
        rig.root.position.copy(
          this.actorPoint(game.motion.segments[0].from, rig.seat, true),
        );
    } else if (rolled) {
      this.rollDice(game.dice);
      this.setPhase("dice");
      this.noMoveUntil = this.now() + (this.reduced ? 120 : 1350);
    }
    if (next.rolling && !previous?.rolling && !this.reduced) {
      this.rollDice(null);
      this.setPhase("dice");
    }
    if (
      !next.rolling &&
      previous?.rolling &&
      !rolled &&
      !isNewMotion &&
      !this.motion
    ) {
      this.diceRoll = null;
      this.dice.forEach((d) => (d.visible = false));
      this.setPhase("idle");
    }
    if (
      game?.card &&
      (rolled ||
        !previous?.game?.card ||
        game.card.title !== previous.game.card.title) &&
      game.revision !== previous?.game?.revision
    ) {
      this.pendingCard = {
        card: game.card,
        at: this.now() + (rolled ? 1300 : 200),
      };
    }
    if (game?.status === "ended" && previous?.game?.status !== "ended") {
      this.pendingCard = null;
      this.noMoveUntil = null;
      for (const actor of this.actors.values()) actor.walking = false;
      this.motion = null;
      this.diceRoll = null;
      this.dice.forEach((d) => (d.visible = false));
      this.setPhase("idle");
      this.onCue({
        type: "win",
        title: "멋진 여행이었어요!",
        subtitle: game.players
          .filter((p) => game.winners.includes(p.id))
          .map((p) => p.name)
          .join(" · "),
        duration: 3500,
      });
      for (const rig of this.actors.values())
        if (game.winners.includes(rig.id)) {
          rig.celebrateUntil = this.now() + 5000;
          this.burst(rig.root.position, 35);
        }
    }
    if (next.selected != null) {
      this.selectedRing.visible = true;
      this.selectedRing.position.copy(point(next.selected));
      this.selectedRing.position.y = 0.445;
    } else this.selectedRing.visible = false;
    if (!this.motion && !this.focusUntil) {
      this.desiredTarget.set(0, 0.75, 0);
      this.desiredZoom = 1;
    }
  }
  actorPoint(index, seat, playing = true) {
    const p = point(index);
    if (!playing) {
      p.y = 0.46;
      return p;
    }
    const group =
      this.state?.game?.players.filter(
        (other) => !other.out && other.position === index,
      ) || [];
    const player = this.state?.game?.players[seat],
      slot = group.findIndex((other) => other.id === player?.id);
    const offset = standingSlot(
      slot >= 0 ? group.length : 1,
      Math.max(0, slot),
    );
    p.x += offset.x;
    p.z += offset.z;
    return p;
  }
  setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.renderer.domElement.dataset.phase = phase;
    this.onPhase(phase);
    this.onMoving(
      phase === "dice" || phase === "walking" || phase === "building",
    );
  }
  rollDice(values) {
    this.diceRoll = { start: this.now(), values };
    this.dice.forEach((d) => {
      d.visible = !this.reduced;
      d.scale.setScalar(0.9);
    });
  }
  focus(target, zoom = 1.2, duration = 1500) {
    if (!this.follow || this.reduced) return;
    this.desiredTarget.copy(target).multiplyScalar(0.42);
    this.desiredTarget.y = 0.7;
    this.desiredZoom = zoom;
    this.focusUntil = this.now() + duration;
  }
  controls(action) {
    if (action === "rotate") this.desiredYaw += Math.PI / 2;
    if (action === "reset") {
      this.desiredYaw = 0.45;
      this.desiredZoom = 1;
      this.desiredTarget.set(0, 0.75, 0);
      this.focusUntil = null;
    }
    if (action === "zoom") {
      this.desiredZoom = this.desiredZoom > 1.2 ? 1 : 1.4;
      this.focusUntil = this.now() + 6000;
    }
    if (action === "follow") this.follow = !this.follow;
    if (action === "quality") {
      this.quality = this.quality === "low" ? "auto" : "low";
      this.renderer.setPixelRatio(
        this.quality === "low" ? 1 : Math.min(devicePixelRatio, 1.5),
      );
      this.renderer.shadowMap.enabled = this.quality !== "low";
      this.renderer.shadowMap.needsUpdate = true;
      this.onQuality?.(this.quality === "low");
    }
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.width = w;
    this.height = h;
    const aspect = w / h;
    this.baseView = Math.max(27.4, 33.4 / aspect);
    this.camera.left = (-this.baseView * aspect) / 2;
    this.camera.right = -this.camera.left;
    this.camera.top = this.baseView / 2;
    this.camera.bottom = -this.camera.top;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  updateMotion(time) {
    const motion = this.motion;
    if (!motion || time < motion.start) return;
    const rig = this.actors.get(motion.playerId);
    if (!rig) {
      this.motion = null;
      this.setPhase("idle");
      return;
    }
    this.setPhase("walking");
    const segment = motion.segments[motion.segment];
    if (!segment) {
      rig.root.position.copy(this.actorPoint(rig.p.position, rig.seat));
      rig.walking = false;
      rig.celebrateUntil = time + 550;
      this.motion = null;
      this.setPhase("idle");
      this.focusUntil = time + 700;
      return;
    }
    const duration = this.reduced
      ? 1
      : segment.teleport
        ? 850
        : Math.max(165, Math.min(285, 2400 / segment.path.length));
    const t = clamp((time - motion.start) / duration, 0, 1);
    const from = this.actorPoint(
        motion.step ? segment.path[motion.step - 1] : segment.from,
        rig.seat,
      ),
      to = this.actorPoint(segment.path[motion.step], rig.seat);
    rig.root.position.lerpVectors(from, to, smooth(t));
    rig.root.position.y =
      0.43 +
      (segment.teleport
        ? Math.sin(t * Math.PI) * 5.5
        : Math.sin(t * Math.PI) * 0.57);
    rig.root.rotation.y = turnToward(
      rig.root.rotation.y,
      Math.atan2(to.x - from.x, to.z - from.z),
      0.35,
    );
    rig.walking = true;
    if (this.follow && !this.reduced) {
      this.desiredTarget.copy(rig.root.position).multiplyScalar(0.62);
      this.desiredTarget.y = 0.7;
      this.desiredZoom = segment.teleport ? 1.03 : 1.35;
    }
    if (t >= 1) {
      this.burst(
        to,
        segment.teleport ? 22 : 5,
        CHARACTERS[rig.character].color,
      );
      motion.step++;
      motion.start = time;
      if (motion.step >= segment.path.length) {
        motion.step = 0;
        motion.segment++;
      }
    }
  }
  projectLabels(time) {
    const projection = new T.Vector3();
    for (const tile of BOARD) {
      const el = this.labelElements[tile.index];
      if (!el) continue;
      const plate = this.nameplates[tile.index];
      const baseYaw = plate.vertical ? Math.PI / 2 : 0;
      plate.pivot.rotation.y =
        baseYaw + (Math.cos(this.yaw - baseYaw) < 0 ? Math.PI : 0);
      plate.pivot.updateWorldMatrix(true, true);
      const corners = [
        [-1.01, 0, -0.475],
        [1.01, 0, -0.475],
        [1.01, 0, 0.475],
        [-1.01, 0, 0.475],
      ].map((v) =>
        new T.Vector3(...v)
          .applyMatrix4(plate.pivot.matrixWorld)
          .project(this.camera),
      );
      const xs = corners.map((p) => (p.x * 0.5 + 0.5) * this.width),
        ys = corners.map((p) => (-p.y * 0.5 + 0.5) * this.height);
      const left = Math.min(...xs),
        top = Math.min(...ys),
        width = Math.max(...xs) - left,
        height = Math.max(...ys) - top;
      el.style.transform = `translate(${left}px,${top}px)`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.clipPath = `polygon(${xs.map((x, i) => `${((x - left) / width) * 100}% ${((ys[i] - top) / height) * 100}%`).join(",")})`;
      el.style.visibility = corners.some((p) => p.z > 1) ? "hidden" : "visible";
    }
    const current = this.state?.game?.players[this.state.game.current]?.id;
    for (const [id, rig] of this.actors) {
      const el = this.actorElements.get(id);
      if (!el) continue;
      el.dataset.emotion = this.now() < rig.reactionUntil ? rig.reaction : "";
      el.dataset.standing = JSON.stringify({
        x: rig.root.position.x,
        z: rig.root.position.z,
        scale: rig.scale,
        tile: rig.p.position,
      });
      projection.copy(rig.root.position);
      projection.y += 3.12 * rig.scale;
      projection.project(this.camera);
      el.style.transform = `translate(${(projection.x * 0.5 + 0.5) * this.width}px,${(-projection.y * 0.5 + 0.5) * this.height}px) translate(-50%,-100%)`;
      const stacked =
        id !== current &&
        [...this.actors.values()].some(
          (other) =>
            other.id === current && other.p.position === rig.p.position,
        );
      el.style.opacity = "0";
    }
  }
  tick(time) {
    if (this.disposed) return;
    this.frame = requestAnimationFrame((t) => this.tick(t));
    if (document.hidden) {
      this.lastTime = time;
      return;
    }
    if (this.quality === "low" && time - this.lastFrame < 32) return;
    const dt =
      Math.min((time - (this.lastTime || time)) / 1000, 0.05) * this.speed;
    this.lastTime = time;
    this.lastFrame = time;
    time = this.now();
    if (this.diceRoll) {
      const roll = this.diceRoll,
        t = (time - roll.start) / 1000;
      this.dice.forEach((die, i) => {
        const final = roll.values && t > 0.75;
        if (final)
          die.quaternion.slerp(
            diceRotation(roll.values[i], i ? 0.35 : -0.25),
            0.34,
          );
        else die.rotation.set(t * 8 + i, t * 7, t * 5 + i);
        die.position.y = final
          ? T.MathUtils.lerp(die.position.y, 1.8, 0.3)
          : 2.1 +
            Math.abs(Math.sin(t * 8 + i)) * (2.1 * Math.max(0.1, 1 - t * 0.7));
        die.position.x = (i ? 1 : -1) * (1.48 + Math.sin(t * 5) * 0.18);
      });
      if (roll.values && t > 1.03 && !roll.announced) {
        roll.announced = true;
        const total = roll.values[0] + roll.values[1];
        this.onCue({
          type: "dice",
          title:
            roll.values[0] === roll.values[1]
              ? "DOUBLE!"
              : `${total}칸 앞으로!`,
          subtitle: `${roll.values[0]} + ${roll.values[1]} · 신나는 발걸음`,
          duration: 1200,
        });
        this.burst(new T.Vector3(0, 2.7, 4.2), 18);
      }
      if (roll.values && t > 1.55) {
        this.dice.forEach((d) => {
          d.visible = false;
        });
        this.diceRoll = null;
      }
    }
    if (this.noMoveUntil && time >= this.noMoveUntil) {
      this.noMoveUntil = null;
      this.setPhase("idle");
    }
    this.updateMotion(time);
    if (this.pendingCard && time > this.pendingCard.at && !this.motion) {
      this.onCue({
        type: "card",
        title: this.pendingCard.card.title,
        subtitle: this.pendingCard.card.text,
        duration: 2600,
      });
      this.pendingCard = null;
    }
    if (!this.motion && this.focusUntil && time > this.focusUntil) {
      this.focusUntil = null;
      this.desiredTarget.set(0, 0.75, 0);
      this.desiredZoom = 1;
    }
    const lerp = this.reduced ? 1 : 1 - Math.exp(-dt * 3.6);
    this.target.lerp(this.desiredTarget, lerp);
    this.yaw = turnToward(this.yaw, this.desiredYaw, lerp);
    this.zoom = T.MathUtils.lerp(this.zoom, this.desiredZoom, lerp);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * 25,
      34 + this.target.y,
      this.target.z + Math.cos(this.yaw) * 25,
    );
    this.camera.lookAt(this.target);
    this.camera.zoom = this.zoom;
    this.camera.updateProjectionMatrix();
    for (const rig of this.actors.values()) {
      if (rig.pendingReaction && !this.motion && !this.diceRoll) {
        rig.reaction = rig.pendingReaction;
        rig.pendingReaction = null;
        rig.reactionStart = time;
        rig.reactionUntil = time + (this.reduced ? 900 : 1600);
        this.onReaction?.({ playerId: rig.id, kind: rig.reaction });
      }
      const reaction = time < rig.reactionUntil ? rig.reaction : null;
      const surprised =
        reaction === "surprise" ||
        (["sad", "cry"].includes(reaction) && time - rig.reactionStart < 250);
      const sad = !surprised && ["sad", "cry"].includes(reaction);
      const walk = rig.walking && !this.reduced,
        joy =
          (time < rig.celebrateUntil ||
            reaction === "happy" ||
            reaction === "arrive") &&
          !this.reduced;
      const wave =
        !!this.state &&
        !this.state.game &&
        rig.character === this.state.previewCharacter &&
        !this.reduced;
      const cycle = time * (walk ? 0.018 : 0.0025) + rig.seat;
      if (!this.motion || this.motion.playerId !== rig.id) {
        const resting = this.actorPoint(
          rig.p.position,
          rig.seat,
          !!this.state?.game,
        );
        rig.root.position.x = T.MathUtils.lerp(
          rig.root.position.x,
          resting.x,
          1 - Math.exp(-dt * 10),
        );
        rig.root.position.z = T.MathUtils.lerp(
          rig.root.position.z,
          resting.z,
          1 - Math.exp(-dt * 10),
        );
        rig.root.rotation.y = turnToward(
          rig.root.rotation.y,
          this.yaw,
          1 - Math.exp(-dt * 7),
        );
      }
      rig.root.scale.setScalar(rig.scale || 1);
      rig.body.scale.y = this.reduced
        ? 1
        : walk
          ? 1 + Math.sin(cycle) * 0.045
          : 1 + Math.sin(cycle) * 0.015;
      rig.head.rotation.z = this.reduced
        ? 0
        : Math.sin(cycle * 0.6) * (walk ? 0.06 : 0.025);
      rig.ears?.forEach((ear, i) => {
        ear.rotation.z =
          (i ? 1 : -1) * -0.11 +
          (this.reduced
            ? 0
            : Math.sin(cycle + 0.5 + i * 0.7) * (walk ? 0.12 : 0.025));
      });
      rig.head.position.y = 1.68 + (walk ? Math.sin(cycle) * 0.025 : 0);
      rig.arms.forEach((arm, i) => {
        arm.rotation.x = walk
          ? Math.sin(cycle + i * Math.PI) * 0.85
          : joy
            ? -0.6
            : 0;
        arm.rotation.z =
          (i ? 1 : -1) *
          (joy
            ? 2.4
            : wave && i === 1
              ? 2.25 + Math.sin(time * 0.007) * 0.3
              : 0.14);
      });
      rig.legs.forEach((leg, i) => {
        leg.rotation.x = walk ? Math.sin(cycle + i * Math.PI) * 0.72 : 0;
      });
      const blink = !this.reduced && (time + rig.seat * 810) % 4200 < 120;
      rig.eyes.forEach((eye) => (eye.scale.y = blink ? 0.12 : 1));
      rig.head.rotation.x = sad ? 0.16 : surprised ? -0.12 : 0;
      rig.smile.rotation.z = sad ? 0 : Math.PI;
      rig.smile.scale.set(surprised ? 0.75 : 1, surprised ? 1.8 : 1, 1);
      rig.eyes.forEach((eye, i) => {
        eye.rotation.z = sad ? (i ? -0.22 : 0.22) : 0;
        if (surprised) eye.scale.y = 1.3;
        else if (reaction === "happy") eye.scale.y = 0.45;
      });
      rig.tears.forEach((tear, i) => {
        tear.visible = sad;
        tear.position.y =
          -0.14 -
          (this.reduced
            ? 0
            : (((time - rig.reactionStart + i * 200) % 600) / 600) *
              (reaction === "cry" ? 0.36 : 0.18));
      });
      if (sad) {
        rig.head.position.y -= 0.08;
        rig.ears.forEach((ear, i) => (ear.rotation.z += (i ? 1 : -1) * 0.35));
        rig.arms.forEach((arm, i) => {
          arm.rotation.x = reaction === "cry" ? -1.5 : 0.15;
          arm.rotation.z = (i ? 1 : -1) * (reaction === "cry" ? -0.2 : 0.05);
        });
      }
      if (!this.motion || this.motion.playerId !== rig.id)
        rig.root.position.y =
          (this.state?.game ? 0.43 : 0.46) +
          (joy ? Math.max(0, Math.sin(time * 0.012)) * 0.19 : 0);
      rig.shadow.position.set(rig.root.position.x, 0.449, rig.root.position.z);
      rig.shadow.scale.setScalar(
        (rig.scale || 1) *
          Math.max(0.5, 1 - (rig.root.position.y - 0.43) * 0.14),
      );
    }
    const current = this.state?.game?.players[this.state.game.current]?.id,
      active = this.actors.get(current);
    this.activeRing.visible =
      !!active && this.state?.game?.status === "playing";
    if (active) {
      this.activeRing.position.set(
        active.root.position.x,
        0.49,
        active.root.position.z,
      );
      this.activeRing.scale.setScalar(
        active.scale * (1 + (this.reduced ? 0 : Math.sin(time * 0.006) * 0.06)),
      );
    }
    if (!this.reduced) {
      this.park.animated.forEach((a) => {
        if (a.type === "windmill") a.root.rotation.z = time * 0.00017;
        else a.root.position.y = a.baseY + Math.sin(time * 0.0007) * 0.35;
      });
      this.clouds.forEach((c, i) => {
        c.root.position.x = c.x + Math.sin(time * 0.00015 + i) * 0.65;
      });
    }
    this.effects = this.effects.filter((effect) => {
      const t = clamp((time - effect.start) / 900, 0, 1),
        pop =
          t < 0.65
            ? smooth(t / 0.65)
            : 1 + Math.sin(((t - 0.65) / 0.35) * Math.PI) * 0.13;
      effect.root.scale.setScalar(effect.scale * pop);
      effect.root.position.y = effect.base.y + Math.max(0, 1 - t / 0.65) * 2.5;
      if (t === 1) {
        effect.root.scale.setScalar(effect.scale);
        effect.root.position.copy(effect.base);
        this.renderer.shadowMap.needsUpdate = true;
        return false;
      }
      return true;
    });
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.v.y -= dt * 5;
      p.p.addScaledVector(p.v, dt);
      return p.life > 0;
    });
    const attrs = this.sparkles.geometry.attributes;
    this.particles.forEach((p, i) => {
      attrs.position.setXYZ(i, p.p.x, p.p.y, p.p.z);
      attrs.color.setXYZ(i, p.tint.r, p.tint.g, p.tint.b);
    });
    attrs.position.needsUpdate = attrs.color.needsUpdate = true;
    this.sparkles.geometry.setDrawRange(0, this.particles.length);
    this.renderer.render(this.scene, this.camera);
    this.projectLabels(time);
    this.renderer.domElement.dataset.ready = "true";
    this.frameTimes.push((dt / this.speed) * 1000);
    if (this.frameTimes.length >= 90) {
      const average =
        this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.renderer.domElement.dataset.frameMs = average.toFixed(1);
      if (average > 32 && this.quality === "auto") {
        this.controls("quality");
        this.renderer.domElement.dataset.adaptiveQuality = "low";
      }
      this.frameTimes = [];
    }
    this.renderer.domElement.dataset.drawCalls = String(
      this.renderer.info.render.calls,
    );
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.onMoving(false);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.renderer.domElement.removeEventListener("click", this.pick);
    const geometries = new Set(this.F.geometries.values()),
      materials = new Set(this.F.materials.values());
    this.scene.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      if (node.material) {
        for (const material of Array.isArray(node.material)
          ? node.material
          : [node.material])
          materials.add(material);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
