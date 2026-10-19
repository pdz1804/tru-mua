/**
 * Every balance number from the design's "Cơ chế" table, in one place, with the pure rules that
 * use them. The chapter runtime only calls these; unit tests pin them to the design.
 */
export const TUNING = {
  /** Wetness gained per second in the open, multiplied by rain intensity (1 = normal rain). */
  wetPerSec: 6,
  /** Wetness lost per second under the umbrella, an awning or indoors. */
  dryPerSec: 15,
  /** Holding hands is allowed within this distance and keeps full speed. */
  holdRange: 1.6,
  /** Walking speed while holding hands (both move at the leader's pace). */
  holdSpeed: 3.8,
  /** Walking close (< 1 m) without holding hands slows both people down. */
  closeSlow: 0.8,
  /** Speed multiplier while wading through a puddle. */
  puddleSlow: 0.6,
  /** Su wets this much slower while wearing Phú's jacket. */
  jacketFactor: 0.5,
  /** Thunder: flash, then after `thunderDelay` s the rain is ×thunderMul for `thunderLen` s. */
  thunderDelay: 2,
  thunderMul: 2.2,
  thunderLen: 6,
  /** A passing scooter splashing someone directly. */
  scooterSplash: 22,
  /** A scooter passing a puddle next to someone who is not under cover. */
  puddleNearSplash: 10,
  /** Riding through a puddle on the Exciter. */
  puddleRide: 6,
  /** A truck overtaking on the left while Su is not turning her face away. */
  truckSplash: 25,
  /** Seconds of warning before a scooter or truck reaches the couple. */
  warnSec: 2,
  /** Scooters appear this far ahead (m) at 8 to 11 m/s. */
  scooterSpawnDist: 26,
  scooterSpeedMin: 8,
  scooterSpeedMax: 11,
  /** A truck starts this far behind the bike (m) and overtakes this much faster (m/s). */
  truckSpawnBack: 34,
  truckOvertake: 9,
  /** Exciter speeds (m/s) on the open road and while handing out bread. */
  rideSpeed: 11,
  breadSpeed: 8,
  /** Bread hand-over: reach along the road (m), the bike slows inside `breadSlowDist`, and a person passed by more than `breadMissPast` gets their loaf thrown. */
  breadReach: 2.4,
  breadSlowDist: 12,
  breadSlowSpeed: 3,
  breadMissPast: 2.8,
  /** Jump heights (m): one jump reaches 1.07, Su's double jump 1.9; crates are 1.5. */
  jumpV: 6.2,
  doubleJumpV: 5.6,
  gravity: 18,
  crateHeight: 1.5,
  /** At 100 % wet: a sneeze, back to the nearest awning at this wetness. Nothing is lost. */
  sneezeResetTo: 40,
  /** Stamps. */
  goldUmbrellaBelow: 30,
  holdStampSec: 20,
  breadFirst: 12,
  breadExtra: 5,
} as const;

/** Wetness after `dt` seconds. */
export function wetStep(wet: number, dt: number, o: { covered: boolean; intensity: number; jacket?: boolean }) {
  let rate = o.covered ? -TUNING.dryPerSec : TUNING.wetPerSec * o.intensity;
  if (o.jacket && rate > 0) rate *= TUNING.jacketFactor;
  return Math.max(0, Math.min(100, wet + rate * dt));
}

/** Walking speed multiplier from how the couple are walking together. */
export function speedFactor(o: { holding: boolean; distance: number; inPuddle?: boolean }) {
  let k = 1;
  if (!o.holding && o.distance < 1) k *= TUNING.closeSlow;
  if (o.inPuddle) k *= TUNING.puddleSlow;
  return k;
}

/** Peak height of a jump with launch speed v under the chapter gravity. */
export const jumpHeight = (v: number) => (v * v) / (2 * TUNING.gravity);

/** Rain intensity multiplier over a thunder cycle, `t` seconds after the flash. */
export function thunderMul(t: number) {
  return t >= TUNING.thunderDelay && t < TUNING.thunderDelay + TUNING.thunderLen ? TUNING.thunderMul : 1;
}

/** Wetness after a sneeze: whoever is wetter than the reset level drops to it; the dry one stays dry. */
export const afterSneeze = (wet: number) => Math.min(wet, TUNING.sneezeResetTo);

/** Show the warning once the vehicle is within `warnSec` of reaching us. `gap` in m, `closing` in m/s. */
export function shouldWarn(gap: number, closing: number) {
  return closing > 0 && gap > 0 && gap / closing <= TUNING.warnSec;
}

export type ScooterHit = { kind: 'miss' | 'blocked' | 'soaked' | 'puddle'; wet: number };

/**
 * What a scooter passing a walker does. `dz` is the lane distance. An open umbrella (or
 * holding hands under it) blocks a direct splash; an awning or indoors is out of reach.
 */
export function scooterHit(o: { dz: number; airborne: boolean; covered: boolean; sheltered: boolean; puddleNear: boolean }): ScooterHit {
  if (o.dz < 0.85 && !o.airborne) {
    if (o.covered && !o.sheltered) return { kind: 'blocked', wet: 0 };
    return { kind: 'soaked', wet: TUNING.scooterSplash };
  }
  if (o.dz < 2.4 && o.puddleNear && !o.covered) return { kind: 'puddle', wet: TUNING.puddleNearSplash };
  return { kind: 'miss', wet: 0 };
}

export type TruckHit = { kind: 'dodged' | 'shielded' | 'face'; wet: number };

/** A truck overtaking on the left: only the left part of the road is splashed; Su turning her face away saves her. */
export function truckHit(o: { z: number; shielding: boolean }): TruckHit {
  if (o.z >= 1.6) return { kind: 'dodged', wet: 0 };
  return o.shielding ? { kind: 'shielded', wet: 0 } : { kind: 'face', wet: TUNING.truckSplash };
}

/** Loaves left after handing one over: a single person takes one; the two cô at the station share the last one, then five more are bought. */
export function serveBread(bread: number, who: 'single' | 'station') {
  const left = Math.max(0, bread - 1);
  return who === 'station' ? left + TUNING.breadExtra : left;
}

/** The shield stamp: Su turned her face for at least one truck and was never splashed in the face. */
export const shieldStamp = (o: { shielded: number; faceSplashes: number }) => o.shielded > 0 && o.faceSplashes === 0;

/** Words instead of numbers for how wet someone is, so no digit is ever shown. */
export function wetWord(v: number) {
  if (v < 10) return 'khô ráo';
  if (v < 40) return 'hơi ướt';
  if (v < 75) return 'ướt';
  return 'ướt sũng';
}

export interface Stamp {
  label: string;
  earned: boolean;
}
