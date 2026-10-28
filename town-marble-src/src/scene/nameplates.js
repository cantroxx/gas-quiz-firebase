import * as T from "three";
import { BOARD, GROUPS, tilePoint } from "../../shared/data.js";

// Names occupy a separate, flat outer lane. No price/owner popovers cover the world.
export function namePoint(index) {
  const p = tilePoint(index),
    x = (p.x - 4) * 2.12,
    z = (p.y - 4) * 2.12;
  const corner = index % 8 === 0;
  return new T.Vector3(
    x + (Math.abs(x) > 8 ? Math.sign(x) * (corner ? 1.72 : 2.1) : 0),
    -0.105,
    z + (Math.abs(z) > 8 ? Math.sign(z) * (corner ? 1.72 : 2.1) : 0),
  );
}

export function makeNameplates(scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  BOARD.forEach((tile) => {
    const x = (tile.index % 8) * 256,
      y = Math.floor(tile.index / 8) * 128;
    ctx.fillStyle = tile.type === "city" ? GROUPS[tile.group] : "#c69b48";
    ctx.fillRect(x + 108, y + 102, 40, 5);
    let size = 64;
    ctx.font = `900 ${size}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    while (ctx.measureText(tile.name).width > 240)
      ctx.font = `900 ${--size}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#3c5965";
    ctx.fillText(tile.name, x + 128, y + 58);
  });
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const plates = BOARD.map((tile) => {
    const geometry = new T.PlaneGeometry(2.02, 0.95),
      uv = geometry.attributes.uv;
    const col = tile.index % 8,
      row = Math.floor(tile.index / 8);
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) + col) / 8, (uv.getY(i) + 3 - row) / 4);
    const mesh = new T.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    const pivot = new T.Group();
    pivot.position.copy(namePoint(tile.index));
    pivot.add(mesh);
    scene.add(pivot);
    const vertical =
      tile.index % 8 !== 0 && Math.abs(tilePoint(tile.index).x - 4) === 4;
    return { pivot, vertical };
  });
  return plates;
}
