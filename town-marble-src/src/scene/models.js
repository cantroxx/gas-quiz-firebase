import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Geometry/material sharing and static batching keep the toy world inexpensive to draw.
export function createFactory() {
  const materials = new Map(),
    geometries = new Map();
  const geometry = (key, build) => {
    if (!geometries.has(key)) geometries.set(key, build());
    return geometries.get(key);
  };
  const material = (color) => {
    if (!materials.has(color))
      materials.set(
        color,
        new T.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02 }),
      );
    return materials.get(color);
  };
  const add = (parent, geom, color, position, scale) => {
    const mesh = new T.Mesh(geom, material(color));
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ball = (parent, color, position, scale = [1, 1, 1]) =>
    add(
      parent,
      geometry("ball", () => new T.SphereGeometry(1, 16, 12)),
      color,
      position,
      scale,
    );
  const box = (parent, color, position, scale = [1, 1, 1], round = true) =>
    add(
      parent,
      geometry(round ? "roundBox" : "box", () =>
        round
          ? new RoundedBoxGeometry(1, 1, 1, 2, 0.12)
          : new T.BoxGeometry(1, 1, 1),
      ),
      color,
      position,
      scale,
    );
  const cylinder = (parent, color, position, scale, cone = false) =>
    add(
      parent,
      geometry(
        cone ? "cone" : "cylinder",
        () => new T.CylinderGeometry(cone ? 0 : 1, 1, 1, 16),
      ),
      color,
      position,
      scale,
    );
  const ring = (
    parent,
    color,
    position,
    radius,
    tube = 0.035,
    arc = Math.PI * 2,
  ) =>
    add(
      parent,
      geometry(
        `ring${radius}:${tube}:${arc}`,
        () => new T.TorusGeometry(radius, tube, 6, 32, arc),
      ),
      color,
      position,
    );
  const group = (parent, position = [0, 0, 0]) => {
    const g = new T.Group();
    g.position.set(...position);
    parent?.add(g);
    return g;
  };
  function batch(root) {
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert(),
      byMaterial = new Map(),
      old = [];
    root.traverse((node) => {
      if (!node.isMesh || Array.isArray(node.material)) return;
      const shape = node.geometry.index
        ? node.geometry.toNonIndexed()
        : node.geometry.clone();
      shape.applyMatrix4(
        new T.Matrix4().multiplyMatrices(inverse, node.matrixWorld),
      );
      if (!byMaterial.has(node.material)) byMaterial.set(node.material, []);
      byMaterial.get(node.material).push(shape);
      old.push(node);
    });
    const shared = new Set(geometries.values());
    const retired = new Set();
    for (const mesh of old) {
      mesh.removeFromParent();
      if (!shared.has(mesh.geometry)) retired.add(mesh.geometry);
    }
    retired.forEach((g) => g.dispose());
    for (const [mat, shapes] of byMaterial) {
      const merged = mergeGeometries(shapes, false);
      shapes.forEach((g) => g.dispose());
      if (!merged) throw new Error("Unable to batch world geometry");
      const mesh = new T.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    return root;
  }
  return {
    material,
    ball,
    box,
    cylinder,
    ring,
    group,
    batch,
    geometries,
    materials,
  };
}

export function makeCharacter(F, character) {
  const root = F.group(),
    body = F.group(root),
    head = F.group(root, [0, 1.68, 0]);
  const skin = ["#fff5de", "#ffe27a", "#f5ad73", "#ab7453"][character];
  const suit = ["#80cabb", "#91bfdc", "#b3a0db", "#edb67b"][character];
  const cream = character === 1 ? "#ffb64e" : "#fff0d5";
  F.ball(body, suit, [0, 0.76, 0], [0.48, 0.58, 0.36]);
  F.box(body, suit, [0, 1.05, 0.33], [0.5, 0.32, 0.1]);
  F.ball(body, skin, [0, 1.16, 0], [0.31, 0.21, 0.29]);
  for (const x of [-0.22, 0.22]) {
    F.box(body, suit, [x, 1.14, 0.28], [0.1, 0.36, 0.13]);
    F.ball(body, "#f8d678", [x, 1.09, 0.4], [0.045, 0.045, 0.023]);
  }
  const scarf = F.ring(
    body,
    character === 0 ? "#f2a689" : "#6fbfae",
    [0, 1.23, 0],
    0.29,
    0.08,
  );
  scarf.rotation.x = Math.PI / 2;
  F.ball(body, skin, [0, 0.69, -0.37], [0.18, 0.18, 0.17]);
  if (character === 2) {
    const tail = F.ring(
      body,
      skin,
      [0.33, 0.72, -0.37],
      0.38,
      0.12,
      Math.PI * 1.3,
    );
    tail.rotation.y = Math.PI / 2;
  }
  F.ball(head, skin, [0, 0, 0], [0.68, 0.62, 0.55]);
  if (character !== 1) F.ball(head, cream, [0, -0.19, 0.46], [0.31, 0.2, 0.12]);
  const ears = [];
  if (character === 0)
    for (const side of [-1, 1]) {
      const ear = F.group(head, [side * 0.28, 0.49, 0]);
      ear.rotation.z = side * -0.11;
      ears.push(ear);
      F.ball(ear, skin, [0, 0.39, 0], [0.19, 0.58, 0.14]);
      F.ball(ear, "#efb1ae", [0, 0.42, 0.105], [0.105, 0.41, 0.055]);
    }
  if (character === 1) {
    F.ball(head, "#f8a848", [0, -0.17, 0.55], [0.28, 0.095, 0.24]);
    F.ball(head, "#f8e4a2", [0.09, 0.58, 0], [0.12, 0.18, 0.13]);
  }
  if (character === 2)
    for (const side of [-1, 1]) {
      const ear = F.cylinder(
        head,
        skin,
        [side * 0.45, 0.47, -0.02],
        [0.24, 0.5, 0.21],
        true,
      );
      ear.rotation.z = side * -0.22;
      const inner = F.cylinder(
        head,
        "#e4a099",
        [side * 0.45, 0.48, 0.085],
        [0.14, 0.33, 0.1],
        true,
      );
      inner.rotation.z = side * -0.22;
      F.ball(head, "#d08c52", [side * 0.37, 0.26, 0.42], [0.055, 0.19, 0.035]);
    }
  if (character === 3)
    for (const side of [-1, 1]) {
      F.ball(head, skin, [side * 0.5, 0.46, -0.01], [0.26, 0.27, 0.17]);
      F.ball(head, "#d9ab83", [side * 0.5, 0.46, 0.12], [0.145, 0.16, 0.055]);
    }
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = F.group(head, [side * 0.23, 0.025, 0.497]);
    F.ball(eye, "#3d302d", [0, 0, 0], [0.093, 0.116, 0.051]);
    F.ball(eye, "#ffffff", [-0.023, 0.039, 0.045], [0.024, 0.03, 0.014]);
    eyes.push(eye);
    F.ball(
      head,
      character === 1 ? "#f4af86" : "#edb0a3",
      [side * 0.4, -0.15, 0.435],
      [0.1, 0.055, 0.031],
    );
  }
  if (character !== 1)
    F.ball(
      head,
      character === 0 ? "#dc9694" : "#64473a",
      [0, -0.14, 0.58],
      [0.065, 0.047, 0.035],
    );
  const smile = F.ring(
    head,
    "#805a4d",
    [0, -0.225, 0.575],
    0.072,
    0.013,
    Math.PI,
  );
  smile.rotation.z = Math.PI;
  const tears = [-1, 1].map((side) => {
    const tear = F.ball(
      head,
      "#7edbfa",
      [side * 0.25, -0.16, 0.57],
      [0.055, 0.12, 0.04],
    );
    tear.visible = false;
    return tear;
  });
  const arms = [],
    legs = [];
  for (const side of [-1, 1]) {
    const arm = F.group(root, [side * 0.48, 1.08, 0]);
    arm.rotation.z = side * 0.14;
    F.ball(arm, skin, [0, -0.2, 0], [0.16, 0.31, 0.16]);
    F.ball(arm, skin, [0, -0.4, 0.025], [0.17, 0.17, 0.17]);
    arms.push(arm);
    const leg = F.group(root, [side * 0.23, 0.42, 0]);
    F.ball(leg, suit, [0, -0.1, 0], [0.21, 0.28, 0.23]);
    F.ball(
      leg,
      character === 1 ? "#efaa43" : skin,
      [0, -0.31, 0.1],
      [0.23, 0.15, 0.31],
    );
    legs.push(leg);
  }
  // Batch rigid sections independently, preserving head/limb articulation.
  [body, ...arms, ...legs].forEach(F.batch);
  // Eyes are left separate for blinks; the head's remaining geometry is batched around them.
  ears.forEach(F.batch);
  [...eyes, ...ears, smile, ...tears].forEach((e) => e.removeFromParent());
  F.batch(head);
  [...eyes, ...ears, smile, ...tears].forEach((e) => head.add(e));
  return {
    root,
    body,
    head,
    arms,
    legs,
    eyes,
    smile,
    tears,
    ears,
    character,
    baseYaw: 0,
    walking: false,
    celebrateUntil: 0,
  };
}

export function makeBuilding(F, level, tint = "#9dbccb", landmark = 0) {
  const root = F.group(),
    floors = Math.max(1, level);
  const height = 0.3 + floors * 0.35;
  F.box(root, "#fff0cf", [0, height / 2, 0], [0.92, height, 0.77]);
  const roof = F.cylinder(
    root,
    tint,
    [0, height + 0.19, 0],
    [0.72, 0.46, 0.62],
    true,
  );
  roof.rotation.y = Math.PI / 4;
  F.box(root, "#9ad0d5", [0, 0.2, 0.403], [0.19, 0.35, 0.025]);
  for (let floor = 0; floor < floors; floor++)
    for (const side of [-1, 1])
      F.box(
        root,
        "#83b8c5",
        [side * 0.27, 0.3 + floor * 0.31, 0.402],
        [0.14, 0.17, 0.025],
      );
  if (level >= 2) {
    F.box(root, tint, [0, 0.57, 0.46], [1.01, 0.12, 0.22]);
    F.cylinder(
      root,
      "#ffe4ab",
      [0.45, height * 0.7, -0.1],
      [0.2, height * 1.3, 0.2],
    );
    F.cylinder(root, tint, [0.45, height * 1.4, -0.1], [0.3, 0.4, 0.3], true);
  }
  if (level >= 3) {
    F.box(root, "#ffe8ba", [-0.45, 0.5, 0], [0.38, 1, 0.6]);
    F.cylinder(root, tint, [-0.45, 1.16, 0], [0.37, 0.45, 0.37], true);
    F.cylinder(root, "#ddaf51", [0, height + 0.57, 0], [0.02, 0.55, 0.02]);
    F.box(root, "#f5d171", [0.14, height + 0.7, 0], [0.28, 0.16, 0.035], false);
  }
  if (landmark % 4 === 1 && level === 0) {
    F.cylinder(root, "#f0d7b0", [0, 0.73, 0], [0.18, 1.0, 0.18]);
    F.cylinder(root, tint, [0, 1.33, 0], [0.32, 0.5, 0.32], true);
  }
  return F.batch(root);
}

export function makePark(F, parent) {
  const statics = F.group(parent),
    water = F.group(parent),
    animated = [];
  F.box(statics, "#92c896", [0, -0.08, 0], [14.45, 0.3, 14.45]);
  F.box(statics, "#e5d6ac", [0, 0.09, 0.9], [2.1, 0.1, 10]);
  F.box(statics, "#eadfbe", [0, 0.09, -0.5], [12, 0.1, 1.8]);
  // A real pond, bridge and fountain, rather than a picture underneath the board.
  F.ball(water, "#49bbc8", [2.9, 0.08, 3.5], [3.1, 0.09, 2.4]);
  F.ring(water, "#b4ecdc", [2.9, 0.17, 3.5], 1.65, 0.04).rotation.x =
    -Math.PI / 2;
  F.box(statics, "#fff1d0", [1.0, 0.38, 3.5], [0.85, 0.19, 3.2]);
  for (const x of [0.53, 1.47])
    for (let z = 2.1; z < 5; z += 0.55)
      F.cylinder(statics, "#f5dfbb", [x, 0.62, z], [0.05, 0.55, 0.05]);
  for (const x of [0.53, 1.47])
    F.box(statics, "#f6e4bd", [x, 0.93, 3.5], [0.08, 0.1, 3.2]);
  F.cylinder(statics, "#efe2c4", [-2.0, 0.35, 3.2], [1.1, 0.32, 1.1]);
  F.cylinder(water, "#86d8d8", [-2.0, 0.53, 3.2], [0.9, 0.07, 0.9]);
  F.cylinder(statics, "#fff5df", [-2, 0.9, 3.2], [0.17, 0.85, 0.17]);
  F.ball(water, "#bcecef", [-2, 1.4, 3.2], [0.33, 0.17, 0.33]);
  // Castle with layered roofs, windows and flags.
  const castle = F.group(statics, [0, 0.1, -2]);
  F.box(castle, "#fff0d7", [0, 1.12, 0], [2.9, 2.25, 2.0]);
  F.box(castle, "#9bcfd3", [0, 0.61, 1.02], [0.68, 1.15, 0.08]);
  F.box(castle, "#efd1aa", [0, 0.09, 1.43], [1.5, 0.16, 0.9]);
  for (const x of [-1.45, 1.45])
    for (const z of [-0.9, 0.9]) {
      F.cylinder(castle, "#ffecd2", [x, 1.3, z], [0.48, 2.6, 0.48]);
      F.cylinder(
        castle,
        z > 0 ? "#f19f8f" : "#61b8b0",
        [x, 2.98, z],
        [0.67, 1.25, 0.67],
        true,
      );
      F.ball(castle, "#e9c365", [x, 3.62, z], [0.085, 0.1, 0.085]);
      F.box(castle, "#a0cad0", [x, 1.7, z + 0.47], [0.2, 0.4, 0.05]);
    }
  F.cylinder(castle, "#fff2dc", [0, 2.1, 0], [0.7, 3.7, 0.7]);
  F.cylinder(castle, "#eb8f98", [0, 4.42, 0], [0.98, 1.4, 0.98], true);
  F.cylinder(castle, "#d2aa50", [0, 5.33, 0], [0.035, 0.5, 0.035]);
  F.box(castle, "#fbd988", [0.25, 5.5, 0], [0.5, 0.28, 0.06], false);
  for (const x of [-0.8, 0.8])
    for (const y of [0.8, 1.6])
      F.box(castle, "#95c3ca", [x, y, 1.03], [0.3, 0.42, 0.05]);
  // Tree clusters and miniature neighborhoods are part of the board's geometry.
  const positions = [
    [-5.8, -5.7],
    [-4.2, -5.8],
    [4.4, -5.8],
    [5.8, -4.7],
    [-6, -2.4],
    [-6, 0],
    [-5.3, 3.1],
    [-5.9, 5.6],
    [-3.7, 5.7],
    [5.8, 5.7],
    [5.9, 2.0],
    [5.5, -0.4],
  ];
  positions.forEach(([x, z], i) => {
    F.cylinder(statics, "#b39b6c", [x, 0.5, z], [0.14, 0.85, 0.14]);
    F.ball(
      statics,
      i % 2 ? "#65b78e" : "#82c99d",
      [x, 1.13, z],
      [0.58, 0.83, 0.55],
    );
    F.ball(statics, "#b3d5a2", [x + 0.26, 1.25, z], [0.36, 0.47, 0.39]);
    if (i % 3 === 0) {
      const house = makeBuilding(
        F,
        0,
        ["#eeb5ac", "#9abdcf", "#d4bee1"][i % 3],
        i,
      );
      house.position.set(x + 1.1, 0.1, z + 0.3);
      house.scale.setScalar(0.92);
      statics.add(house);
    }
  });
  // A slowly turning windmill and floating balloon give the world a life of its own.
  const windmill = F.group(statics, [-4.5, 0.1, -1.7]);
  F.cylinder(windmill, "#f8e6c6", [0, 1, 0], [0.48, 2, 0.48]);
  F.cylinder(windmill, "#9ac1c9", [0, 2.25, 0], [0.67, 0.75, 0.67], true);
  const blades = F.group(parent, [-4.5, 1.95, -1.12]);
  for (let i = 0; i < 4; i++) {
    const blade = F.group(blades);
    blade.rotation.z = (i * Math.PI) / 2;
    F.box(blade, "#fff4db", [0, 0.7, 0], [0.22, 1.4, 0.1]);
    F.box(blade, "#e6c58e", [0.14, 0.88, 0], [0.34, 0.65, 0.06]);
  }
  F.ball(blades, "#d9b274", [0, 0, 0.09], [0.16, 0.16, 0.12]);
  F.batch(blades);
  animated.push({ root: blades, type: "windmill" });
  const balloon = F.group(parent, [4.7, 4.9, -2.8]);
  F.ball(balloon, "#f4beae", [0, 1.2, 0], [0.85, 1.05, 0.85]);
  F.ball(balloon, "#d9e1ae", [0, 1.2, 0.14], [0.31, 1.04, 0.75]);
  F.box(balloon, "#c6a479", [0, -0.25, 0], [0.52, 0.4, 0.48]);
  for (const x of [-0.23, 0.23]) {
    F.cylinder(balloon, "#dfcda4", [x, 0.23, 0], [0.018, 0.72, 0.018]);
  }
  F.batch(balloon);
  animated.push({ root: balloon, type: "balloon", baseY: 4.9 });
  F.batch(statics);
  F.batch(water);
  return { statics, water, animated };
}
