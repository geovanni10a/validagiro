import * as THREE from 'three';

const sceneHost = document.querySelector('#scene');
const tooltip = document.querySelector('#tooltip');
const list = document.querySelector('#inventory-list');
const connection = document.querySelector('.connection');
const connectionLabel = document.querySelector('#connection-label');
const empty = document.querySelector('#scene-empty');
const search = document.querySelector('#search');

const colors = { LONG: 0x27ae60, ATTENTION: 0xe0b21b, URGENT: 0xf07818, CRITICAL: 0xe53935, EXPIRED: 0x821c2b };
const cssColors = { LONG: '#27ae60', ATTENTION: '#e0b21b', URGENT: '#f07818', CRITICAL: '#e53935', EXPIRED: '#821c2b' };
let inventory = [];
let clickable = [];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07101f);
scene.fog = new THREE.Fog(0x07101f, 28, 72);
const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneHost.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xb9d7ff, 0x182214, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.8);
sun.position.set(12, 22, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -26; sun.shadow.camera.right = 26; sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
scene.add(sun);
const fill = new THREE.PointLight(0x2f7cff, 38, 42);
fill.position.set(-14, 8, 8);
scene.add(fill);

const floor = new THREE.Mesh(new THREE.BoxGeometry(38, .6, 27), new THREE.MeshStandardMaterial({ color: 0x151e27, roughness: .92 }));
floor.position.y = -.35;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(38, 19, 0x34475f, 0x253346);
grid.position.y = .01;
scene.add(grid);

const warehouse = new THREE.Group();
scene.add(warehouse);

const zones = [
  { id: '20000000-0000-4000-8000-000000000001', name: 'Estoque', x: -11, z: -6 },
  { id: '20000000-0000-4000-8000-000000000002', name: 'Área de venda', x: 5, z: -6 },
  { id: '20000000-0000-4000-8000-000000000003', name: 'Geladeira', x: -11, z: 7 },
  { id: '20000000-0000-4000-8000-000000000004', name: 'Congelador', x: 5, z: 7 },
];

function daysUntil(iso) {
  const target = new Date(`${iso}T12:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  return Math.ceil((target - today) / 86400000);
}

function level(iso) {
  const days = daysUntil(iso);
  if (days < 0) return 'EXPIRED';
  if (days <= 14) return 'CRITICAL';
  if (days <= 30) return 'URGENT';
  if (days <= 60) return 'ATTENTION';
  return 'LONG';
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 96;
  const context = canvas.getContext('2d');
  context.fillStyle = '#0b1728'; context.fillRect(0, 0, 512, 96);
  context.strokeStyle = '#385174'; context.lineWidth = 5; context.strokeRect(2, 2, 508, 92);
  context.fillStyle = '#e9f2ff'; context.font = '700 34px Segoe UI, Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 256, 49);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(6.2, 1.16, 1);
  return sprite;
}

function shelf(zone) {
  const group = new THREE.Group();
  group.position.set(zone.x, 0, zone.z);
  const metal = new THREE.MeshStandardMaterial({ color: 0x657487, metalness: .72, roughness: .32 });
  const postGeometry = new THREE.BoxGeometry(.18, 4.8, .18);
  for (const x of [-3.2, 3.2]) for (const z of [-1.65, 1.65]) {
    const post = new THREE.Mesh(postGeometry, metal); post.position.set(x, 2.4, z); post.castShadow = true; group.add(post);
  }
  for (const y of [.45, 1.75, 3.05, 4.35]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(6.6, .14, 3.5), metal); board.position.y = y; board.castShadow = true; board.receiveShadow = true; group.add(board);
  }
  const label = makeLabel(zone.name); label.position.set(0, 5.2, 0); group.add(label);
  warehouse.add(group);
  return group;
}

const shelves = new Map(zones.map((zone) => [zone.id, shelf(zone)]));

function clearBoxes() {
  for (const object of clickable) {
    object.parent?.remove(object);
    object.geometry.dispose();
    object.material.dispose();
  }
  clickable = [];
}

function buildBoxes(items) {
  clearBoxes();
  const byLocation = new Map();
  for (const item of items) {
    const key = item.batch.locationId;
    const values = byLocation.get(key) || [];
    values.push(item); byLocation.set(key, values);
  }
  for (const zone of zones) {
    const parent = shelves.get(zone.id);
    const values = byLocation.get(zone.id) || [];
    values.slice(0, 48).forEach((item, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6) % 3;
      const deck = Math.floor(index / 18);
      const status = level(item.batch.expiryDate);
      const material = new THREE.MeshStandardMaterial({ color: colors[status], roughness: .62, metalness: .04 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(.86, .8, .88), material);
      box.position.set(-2.65 + column * 1.06, .91 + deck * 1.3, -1.05 + row * 1.05);
      box.castShadow = true; box.receiveShadow = true;
      box.userData = item;
      parent.add(box); clickable.push(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: 0x0a1220, transparent: true, opacity: .5 }));
      box.add(edges);
    });
  }
  empty.style.display = items.length ? 'none' : 'grid';
}

let radius = 38, theta = .72, phi = 1.02;
function updateCamera() {
  camera.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
  camera.lookAt(0, 2, 0);
}
updateCamera();

let dragging = false, moved = false, lastX = 0, lastY = 0;
renderer.domElement.addEventListener('pointerdown', (event) => { dragging = true; moved = false; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId); });
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const dx = event.clientX - lastX, dy = event.clientY - lastY;
  if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
  theta -= dx * .007; phi = Math.max(.35, Math.min(1.42, phi + dy * .006)); lastX = event.clientX; lastY = event.clientY; updateCamera();
});
renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
renderer.domElement.addEventListener('wheel', (event) => { event.preventDefault(); radius = Math.max(20, Math.min(58, radius + event.deltaY * .025)); updateCamera(); }, { passive: false });
document.querySelector('#reset-camera').addEventListener('click', () => { radius = 38; theta = .72; phi = 1.02; updateCamera(); });

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('click', (event) => {
  if (moved) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  if (!hit) { tooltip.hidden = true; return; }
  const { product, batch } = hit.object.userData;
  tooltip.innerHTML = `<b>${escapeHtml(product.name)}</b><span>${escapeHtml(product.brand || product.categoryName)}</span><span>Lote: ${escapeHtml(batch.batchNumber || 'não informado')}</span><span>${batch.quantity} un. · vence ${formatDate(batch.expiryDate)}</span><span>${escapeHtml(batch.locationName)}</span>`;
  tooltip.style.left = `${Math.min(event.clientX - sceneHost.getBoundingClientRect().left + 12, sceneHost.clientWidth - 245)}px`;
  tooltip.style.top = `${Math.min(event.clientY - sceneHost.getBoundingClientRect().top + 12, sceneHost.clientHeight - 145)}px`;
  tooltip.hidden = false;
});

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderList() {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  const filtered = inventory.filter(({ product, batch }) => !term || `${product.name} ${product.brand || ''} ${product.barcode} ${batch.batchNumber || ''} ${batch.locationName}`.toLocaleLowerCase('pt-BR').includes(term));
  list.innerHTML = filtered.length ? filtered.map(({ product, batch }) => {
    const status = level(batch.expiryDate);
    return `<article class="item"><i class="item-dot" style="background:${cssColors[status]}"></i><div><b>${escapeHtml(product.name)}</b><small>${escapeHtml(batch.locationName)} · ${escapeHtml(batch.batchNumber || 'sem lote')}</small></div><strong>${batch.quantity} un.</strong></article>`;
  }).join('') : '<div class="empty-list">Nenhum produto encontrado.</div>';
}
search.addEventListener('input', renderList);

async function load() {
  try {
    const response = await fetch('/api/snapshot', { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const snapshot = await response.json();
    const products = new Map(snapshot.products.filter((item) => !item.deletedAt).map((item) => [item.id, item]));
    inventory = snapshot.batches.filter((item) => !item.deletedAt && products.has(item.productId)).map((batch) => ({ product: products.get(batch.productId), batch })).sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
    buildBoxes(inventory); renderList();
    document.querySelector('#stat-products').textContent = new Set(inventory.map((item) => item.product.id)).size;
    document.querySelector('#stat-batches').textContent = inventory.length;
    document.querySelector('#stat-critical').textContent = inventory.filter((item) => ['EXPIRED', 'CRITICAL'].includes(level(item.batch.expiryDate))).length;
    document.querySelector('#stat-units').textContent = inventory.reduce((sum, item) => sum + Number(item.batch.quantity || 0), 0).toLocaleString('pt-BR');
    document.querySelector('#updated-at').textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    connection.className = 'connection online'; connectionLabel.textContent = 'Servidor online';
  } catch {
    connection.className = 'connection offline'; connectionLabel.textContent = 'Sem conexão';
  }
}

function resize() {
  const width = sceneHost.clientWidth, height = sceneHost.clientHeight;
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();
renderer.setAnimationLoop(() => renderer.render(scene, camera));
load(); setInterval(load, 15000);
