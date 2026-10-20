import { describe, expect, it } from 'vitest';
import {
  TUNING,
  afterSneeze,
  sneezeRespawnX,
  wetAfterSneeze,
  jumpHeight,
  scooterHit,
  serveBread,
  shieldStamp,
  shouldWarn,
  speedFactor,
  thunderMul,
  truckHit,
  wetStep,
  wetWord,
} from './tuning';

describe('rain chapter balance matches the design table', () => {
  it('normal rain takes about 16 s to reach a sneeze', () => {
    let wet = 0;
    let t = 0;
    while (wet < 100) {
      wet = wetStep(wet, 0.1, { covered: false, intensity: 1 });
      t += 0.1;
    }
    expect(t).toBeCloseTo(16.7, 0);
  });
  it('drying is faster than getting wet', () => {
    expect(wetStep(50, 1, { covered: true, intensity: 1 })).toBe(35);
    expect(wetStep(50, 1, { covered: false, intensity: 1 })).toBe(56);
  });
  it('the jacket halves how fast Su gets wet', () => {
    expect(wetStep(0, 1, { covered: false, intensity: 1, jacket: true })).toBe(3);
  });
  it('thunder doubles the rain after a 2 s warning, for 6 s', () => {
    expect(thunderMul(1)).toBe(1);
    expect(thunderMul(2.5)).toBe(2.2);
    expect(thunderMul(8.5)).toBe(1);
  });
  it('holding hands keeps full speed; walking close without holding is slower', () => {
    expect(speedFactor({ holding: true, distance: 0.5 })).toBe(1);
    expect(speedFactor({ holding: false, distance: 0.5 })).toBe(0.8);
    expect(speedFactor({ holding: false, distance: 2 })).toBe(1);
  });
  it('only Su double jump reaches the 1.5 m crates', () => {
    const one = jumpHeight(TUNING.jumpV);
    expect(one).toBeCloseTo(1.07, 2);
    expect(one).toBeLessThan(TUNING.crateHeight);
    expect(one + jumpHeight(TUNING.doubleJumpV)).toBeGreaterThan(TUNING.crateHeight);
  });
  it('wading through a puddle slows both walkers', () => {
    expect(speedFactor({ holding: false, distance: 2, inPuddle: true })).toBe(TUNING.puddleSlow);
    expect(speedFactor({ holding: false, distance: 0.5, inPuddle: true })).toBeCloseTo(TUNING.closeSlow * TUNING.puddleSlow);
  });
});

describe('sneeze respawn', () => {
  it('picks the nearest shelter behind the sneezer, else the closest ahead, else the fallback', () => {
    expect(sneezeRespawnX(50, [10, 30, 70], 3)).toBe(30);
    expect(sneezeRespawnX(30, [10, 30, 70], 3)).toBe(30);
    expect(sneezeRespawnX(5, [10, 30], 3)).toBe(10);
    expect(sneezeRespawnX(50, [], 3)).toBe(3);
  });
  it('resets only the sneezer to the reset level; the partner never rises', () => {
    expect(wetAfterSneeze({ p: 100, s: 0 }, 'p')).toEqual({ p: TUNING.sneezeResetTo, s: 0 });
    expect(wetAfterSneeze({ p: 20, s: 100 }, 's')).toEqual({ p: 20, s: TUNING.sneezeResetTo });
    expect(wetAfterSneeze({ p: 90, s: 100 }, 's')).toEqual({ p: TUNING.sneezeResetTo, s: TUNING.sneezeResetTo });
  });
});

describe('sneeze', () => {
  it('sends the soaked one back to 40 % and leaves the dry one dry', () => {
    expect(afterSneeze(100)).toBe(40);
    expect(afterSneeze(0)).toBe(0);
    expect(afterSneeze(25)).toBe(25);
  });
  it('is reached after about 16 s in normal rain, then the reset gives a long dry spell', () => {
    let wet = 0;
    for (let i = 0; i < 400 && wet < 100; i++) wet = wetStep(wet, 0.05, { covered: false, intensity: 1 });
    expect(wet).toBe(100);
    wet = afterSneeze(wet);
    // 40 % again takes 10 s of open rain
    let t = 0;
    while (wet < 100) {
      wet = wetStep(wet, 0.1, { covered: false, intensity: 1 });
      t += 0.1;
    }
    expect(t).toBeCloseTo(10, 0);
  });
});

describe('warnings', () => {
  it('fire only when the vehicle is within warnSec of impact', () => {
    expect(shouldWarn(40, 10)).toBe(false); // 4 s away
    expect(shouldWarn(20, 10)).toBe(true); // exactly warnSec
    expect(shouldWarn(5, 10)).toBe(true);
  });
  it('never fire for something already past or moving away', () => {
    expect(shouldWarn(-1, 10)).toBe(false);
    expect(shouldWarn(10, 0)).toBe(false);
    expect(shouldWarn(10, -3)).toBe(false);
  });
  it('a scooter spawned at the usual distance is not warned about immediately', () => {
    for (const v of [TUNING.scooterSpeedMin, TUNING.scooterSpeedMax]) expect(shouldWarn(TUNING.scooterSpawnDist, v)).toBe(false);
  });
  it('a truck is first warned about while it is still behind, with time to react', () => {
    const gapAtSpawn = TUNING.truckSpawnBack - 3.5;
    expect(shouldWarn(gapAtSpawn, TUNING.truckOvertake)).toBe(false);
    expect(shouldWarn(TUNING.warnSec * TUNING.truckOvertake, TUNING.truckOvertake)).toBe(true);
  });
});

describe('scooter and truck splashes', () => {
  const base = { dz: 0.3, airborne: false, covered: false, sheltered: false, puddleNear: false };
  it('a scooter soaks someone in its lane', () => {
    expect(scooterHit(base)).toEqual({ kind: 'soaked', wet: 22 });
  });
  it('an open umbrella blocks it, an awning does not count as the umbrella', () => {
    expect(scooterHit({ ...base, covered: true }).kind).toBe('blocked');
    expect(scooterHit({ ...base, covered: true, sheltered: true }).kind).toBe('soaked');
  });
  it('a jumper clears a direct hit but still gets the puddle spray', () => {
    expect(scooterHit({ ...base, airborne: true }).kind).toBe('miss');
    expect(scooterHit({ ...base, airborne: true, dz: 1.5, puddleNear: true })).toEqual({ kind: 'puddle', wet: 10 });
  });
  it('the puddle spray only reaches someone uncovered in the next lane', () => {
    const near = { ...base, dz: 1.5, puddleNear: true };
    expect(scooterHit(near).kind).toBe('puddle');
    expect(scooterHit({ ...near, covered: true }).kind).toBe('miss');
    expect(scooterHit({ ...near, puddleNear: false }).kind).toBe('miss');
    expect(scooterHit({ ...near, dz: 3 }).kind).toBe('miss');
  });
  it('a truck splashes Su in the face unless she turned away or the bike is in the right lane', () => {
    expect(truckHit({ z: 1.3, shielding: false })).toEqual({ kind: 'face', wet: 25 });
    expect(truckHit({ z: 1.3, shielding: true })).toEqual({ kind: 'shielded', wet: 0 });
    expect(truckHit({ z: 2.5, shielding: false })).toEqual({ kind: 'dodged', wet: 0 });
  });
  it('the shield stamp needs at least one truck faced and no face splash', () => {
    expect(shieldStamp({ shielded: 0, faceSplashes: 0 })).toBe(false);
    expect(shieldStamp({ shielded: 2, faceSplashes: 0 })).toBe(true);
    expect(shieldStamp({ shielded: 2, faceSplashes: 1 })).toBe(false);
  });
});

describe('bread round', () => {
  it('twelve loaves serve eleven people and the two cô, then five more serve the last five', () => {
    const singles = TUNING.breadFirst - 1;
    let bread: number = TUNING.breadFirst;
    let served = 0;
    for (let i = 0; i < singles; i++) {
      bread = serveBread(bread, 'single');
      served++;
    }
    expect(bread).toBe(1);
    bread = serveBread(bread, 'station'); // the last loaf is shared by two
    served += 2;
    expect(bread).toBe(TUNING.breadExtra);
    for (let i = 0; i < TUNING.breadExtra; i++) {
      bread = serveBread(bread, 'single');
      served++;
    }
    expect(bread).toBe(0);
    expect(served).toBe(18);
  });
  it('never goes below zero', () => {
    expect(serveBread(0, 'single')).toBe(0);
  });
});

describe('wetness words', () => {
  it('never contains a digit and gets stronger with wetness', () => {
    const words = new Set<string>();
    for (let v = 0; v <= 100; v++) {
      const w = wetWord(v);
      expect(w).not.toMatch(/\d/);
      words.add(w);
    }
    expect([...words]).toEqual(['khô ráo', 'hơi ướt', 'ướt', 'ướt sũng']);
  });
});
