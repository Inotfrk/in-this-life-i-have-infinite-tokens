/**
 * 极简刚体：够用来表现「零件没对准掉进机箱里」——重力、落地反弹、摩擦、翻滚、静止。
 *
 * 不做完整的接触流形，也不做零件之间互相碰撞：机箱内壁当成六个平面，
 * 物体用旋转后的 AABB 近似（旋转角度只取 90° 的整数倍，所以 AABB 就是精确的）。
 * 体积小、可离线跑、能写单元测试，这是这个 demo 需要的全部。
 */

const GRAVITY = -980;      // cm/s²（真实重力）
const RESTITUTION = 0.32;  // 落地反弹系数
const FRICTION = 0.72;     // 落地后的切向速度保留比例
const SLEEP_SPEED = 6;     // cm/s，低于这个速度且贴着地面就判定静止
const MAX_SPEED = 900;

/** 旋转 90° 整数倍之后的世界半长 */
export function orientedHalfExtents(half, degrees) {
  const step = ((Math.round(degrees / 90) % 4) + 4) % 4;
  return step % 2 === 0 ? [...half] : [half[0], half[2], half[1]];
}

/**
 * @param {object} spec
 * @param {number[]} spec.half    旋转 90° 前的半长 [hx, hy, hz]
 * @param {number[]} spec.position 初始中心
 * @param {number} [spec.rotation] 初始绕 X 轴角度（度）
 */
export function createBody({ half, position, rotation = 0, mass = 1, velocity = [0, 0, 0], spin = [0, 0, 0] }) {
  return {
    half: [...half],
    position: [...position],
    velocity: [...velocity],
    rotation,
    spin: [...spin],
    mass,
    resting: false,
    age: 0
  };
}

function halfOf(body) {
  return orientedHalfExtents(body.half, body.rotation);
}

/**
 * 推进一步。
 * @param {object} body
 * @param {number} dt  秒
 * @param {{min:number[], max:number[]}} bounds 机箱内腔
 * @returns {object} body（原地修改）
 */
export function stepBody(body, dt, bounds) {
  if (body.resting) return body;
  const step = Math.min(dt, 1 / 60);
  body.age += step;
  body.velocity[1] += GRAVITY * step;
  for (let i = 0; i < 3; i += 1) {
    body.velocity[i] = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, body.velocity[i]));
    body.position[i] += body.velocity[i] * step;
  }
  body.rotation += (body.spin[0] || 0) * step;
  body.spin = [body.spin[0] * 0.985, body.spin[1] * 0.985, body.spin[2] * 0.985];

  const half = halfOf(body);
  // 六面墙：只处理穿透后的推开与反弹
  for (let axis = 0; axis < 3; axis += 1) {
    const lo = bounds.min[axis] + half[axis];
    const hi = bounds.max[axis] - half[axis];
    if (body.position[axis] < lo) {
      body.position[axis] = lo;
      if (body.velocity[axis] < 0) body.velocity[axis] = -body.velocity[axis] * RESTITUTION;
      body.velocity[(axis + 1) % 3] *= FRICTION;
      body.spin = body.spin.map((v) => v * 0.6);
    } else if (body.position[axis] > hi) {
      body.position[axis] = hi;
      if (body.velocity[axis] > 0) body.velocity[axis] = -body.velocity[axis] * RESTITUTION;
      body.velocity[(axis + 1) % 3] *= FRICTION;
      body.spin = body.spin.map((v) => v * 0.6);
    }
  }

  // 贴地静止判定
  const floorY = bounds.min[1] + half[1];
  const onFloor = Math.abs(body.position[1] - floorY) < 0.02;
  const speed = Math.hypot(...body.velocity);
  if (onFloor && speed < SLEEP_SPEED) {
    body.velocity = [0, 0, 0];
    // 角速度慢慢停，姿态保留：以前这里会强行掰回 90° 整数倍，看着像「自动回正」
    body.spin = body.spin.map((v) => v * 0.7);
    if (Math.hypot(...body.spin) < 6) {
      body.spin = [0, 0, 0];
      body.position[1] = floorY;
      body.resting = true;
    }
  }
  return body;
}

/** 一次性把一堆刚体算到静止（测试和无动画环境用） */
export function settleAll(bodies, bounds, maxSeconds = 6) {
  const dt = 1 / 60;
  for (let t = 0; t < maxSeconds; t += dt) {
    if (bodies.every((b) => b.resting)) break;
    for (const body of bodies) stepBody(body, dt, bounds);
  }
  return bodies;
}

export const PHYSICS = { GRAVITY, RESTITUTION, FRICTION, SLEEP_SPEED };
