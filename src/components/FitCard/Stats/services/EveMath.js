export default class EveMath {
  static getAmbientChargeRateMath(Cmax, Cnow, Tchg) {
    return ((10 * Cmax) / Tchg) * (Math.sqrt(Cnow / Cmax) - Cnow / Cmax) || 0;
  }
  static getTurretAcurracy(summary, owner, target) {
    const onBoardVector = owner.summary.situation.vector;
    const hostileVector = target.summary.situation.vector;
    const distanceVector = {
      x:
        target.summary.situation.anchors.anchor1X -
        owner.summary.situation.anchors.anchor1X,
      y:
        target.summary.situation.anchors.anchor1Y -
        owner.summary.situation.anchors.anchor1Y,
    };
    const distance =
      Math.sqrt(Math.pow(distanceVector.x, 2) + Math.pow(distanceVector.y, 2)) /
      100;

    const trackingValue =
      summary.range.tracking * (40000 / summary.range.signatureResolution);
    const signatureRadius = target.summary.capacity.misc.signatureRadius;

    const _angularVelocity = EveMath.#getTurretAcurracy_angularVelocuty(
      distance,
      distanceVector,
      onBoardVector,
      hostileVector
    );
    const _trackingPart = EveMath.#getTurretAcurracy_trackingPart(
      _angularVelocity,
      trackingValue,
      signatureRadius
    );

    const trackingModifier = Math.pow(0.5, _trackingPart);
    const rangeModifier = EveMath.getRangeModifier(summary, owner, target);

    return (trackingModifier * rangeModifier).toFixed(3);
  }
  static getLauncherAccuracy(summary, owner, target) {
    const distanceVector = {
      x:
        target.summary.situation.anchors.anchor1X -
        owner.summary.situation.anchors.anchor1X,
      y:
        target.summary.situation.anchors.anchor1Y -
        owner.summary.situation.anchors.anchor1Y,
    };
    const distance =
      Math.sqrt(Math.pow(distanceVector.x, 2) + Math.pow(distanceVector.y, 2)) /
      100;

    return summary.range.optimalRange < distance * 1000 ? 0 : 1;
  }
  static getDroneAccracy(summary, owner, target) {
    // owner is owner of drone! which is ship
    if (summary.isSentry)
      return EveMath.getTurretAcurracy(summary, owner, target);

    const targetUnitVector = EveMath.#common_makeUnitVector(
      target.summary.situation.vector
    );
    const targetVelocity =
      Math.sqrt(
        Math.pow(target.summary.situation.vector.x, 2) +
          Math.pow(target.summary.situation.vector.y, 2)
      ) * 3;
    const isChasing =
      summary.capacity.propulsion.orbitVelocity < targetVelocity;
    if (isChasing) {
      const droneAccuracyModifier = EveMath.#getDroneAccracy_getAccuracyModifier(
        summary,
        targetVelocity
      );
      const absoluteVelocity = summary.capacity.propulsion.orbitVelocity;
      const droneVector = {
        x: targetUnitVector.x * (absoluteVelocity / 3), // Currently 1px = 3m/s
        y: targetUnitVector.y * (absoluteVelocity / 3),
      };
      const droneSituationsummary = {
        summary: {
          situation: {
            anchors: {
              anchor1X:
                target.summary.situation.anchors.anchor1X -
                (targetUnitVector.x * summary.capacity.propulsion.orbitRange) /
                  10, // Currently 1px = 10m
              anchor1Y:
                target.summary.situation.anchors.anchor1Y -
                (targetUnitVector.y * summary.capacity.propulsion.orbitRange) /
                  10,
            },
            vector: droneVector,
          },
        },
      };
      return (
        EveMath.getTurretAcurracy(summary, droneSituationsummary, target) *
        droneAccuracyModifier
      );
    } else {
      const absoluteVelocity =
        summary.capacity.propulsion.orbitVelocity + targetVelocity;
      const droneVector = {
        x: targetUnitVector.x * (absoluteVelocity / 3), // Currently 1px = 3m/s
        y: targetUnitVector.y * (absoluteVelocity / 3),
      }; // drone positions at perpendicular to targetVector
      const droneSituationsummary = {
        summary: {
          situation: {
            anchors: {
              anchor1X:
                target.summary.situation.anchors.anchor1X +
                (targetUnitVector.y * summary.capacity.propulsion.orbitRange) /
                  10, // Currently 1px = 10m
              anchor1Y:
                target.summary.situation.anchors.anchor1Y -
                (targetUnitVector.x * summary.capacity.propulsion.orbitRange) /
                  10,
            },
            vector: droneVector,
          },
        },
      };
      return EveMath.getTurretAcurracy(summary, droneSituationsummary, target);
    }
  }
  static #getDroneAccracy_getAccuracyModifier = (summary, targetVelocity) => {
    // Estimated modifier - drone movement is too complicated simplify the situation when target velocity is higher than orbit velocity
    //prettier-ignore
    const value = 1 -targetVelocity /
          (summary.capacity.propulsion.maximumVelocity - summary.capacity.propulsion.orbitVelocity);
    if (value >= 1) return 1;
    return value >= 0 ? value : 0.01;
  };
  static getLauncherDamageModifier(summary, target) {
    const signatureRadius = target.summary.capacity.misc.signatureRadius;
    const explosionRadius = summary.range.explosionRadius;
    const explosionVelocity = summary.range.explosionVelocity;
    const damageReductionFactor = summary.range.damageReductionFactor;
    const targetVelocity =
      Math.sqrt(
        Math.pow(target.summary.situation.vector.x, 2) +
          Math.pow(target.summary.situation.vector.y, 2)
      ) * 3;

    const simplePart = signatureRadius / explosionRadius;
    const complexPart = Math.pow(
      (signatureRadius * explosionVelocity) /
        (explosionRadius * targetVelocity),
      damageReductionFactor
    );

    return Math.min(1, simplePart, complexPart);
  }
  static getTurretRandomDamageModifier() {
    const randomDamageModifier = Math.random();
    return randomDamageModifier < 0.01 ? 3 : randomDamageModifier + 0.49;
  }
  static getRangeModifier(summary, owner, target) {
    const distanceVector = {
      x:
        target.summary.situation.anchors.anchor1X -
        owner.summary.situation.anchors.anchor1X,
      y:
        target.summary.situation.anchors.anchor1Y -
        owner.summary.situation.anchors.anchor1Y,
    };
    const distance =
      Math.sqrt(Math.pow(distanceVector.x, 2) + Math.pow(distanceVector.y, 2)) /
      100;

    const optimal = summary.range.optimalRange;
    const falloff = summary.range.falloffRange;
    if (distance * 1000 > optimal + 3 * falloff) return 0;

    const denominator = falloff;
    const numerator = Math.max(0, distance * 1000 - optimal);
    const _distancePart = Math.pow(numerator / denominator, 2);

    return Math.pow(0.5, _distancePart);
  }

  static #getTurretAcurracy_trackingPart = (
    angularVelocity,
    trackingValue,
    signatureRadius
  ) => {
    const denominator = trackingValue * signatureRadius;
    const numerator = angularVelocity * 40000;
    return Math.pow(numerator / denominator, 2);
  };
  static #getTurretAcurracy_distancePart = (optimal, fallOff, distance) => {
    const denominator = fallOff;
    const numerator = Math.max(0, distance * 1000 - optimal);
    return Math.pow(numerator / denominator, 2);
  };
  static #getTurretAcurracy_angularVelocuty = (
    distance,
    distanceVector,
    onBoardVector,
    hostileVector
  ) => {
    if (
      EveMath.#getTurretAcurracy_validateVector(distanceVector) &&
      EveMath.#getTurretAcurracy_validateVector(onBoardVector) &&
      EveMath.#getTurretAcurracy_validateVector(hostileVector)
    ) {
      const perpendicularVector = { x: -distanceVector.y, y: distanceVector.x };
      const perpendicularUnitVector = EveMath.#common_makeUnitVector(
        perpendicularVector
      );
      const hostileOrbitalVelocity = EveMath.#getTurretAcurracy_innerProduct(
        perpendicularUnitVector,
        hostileVector
      );
      const onBoardOrbitalVelocity = EveMath.#getTurretAcurracy_innerProduct(
        perpendicularUnitVector,
        onBoardVector
      );
      const trueObitalVelocity =
        (hostileOrbitalVelocity - onBoardOrbitalVelocity) * 3;
      return trueObitalVelocity / (distance * 1000);
    } else return false;
  };
  static #getTurretAcurracy_innerProduct = (unitVector, velocityVector) => {
    return unitVector.x * velocityVector.x + unitVector.y * velocityVector.y;
  };
  static #getTurretAcurracy_validateVector = (vector) => {
    if (vector.x !== undefined && vector.y !== undefined) return true;
    else return false;
  };
  static #common_makeUnitVector = (vector) => {
    const length = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
    return { x: vector.x / length, y: vector.y / length };
  };
}