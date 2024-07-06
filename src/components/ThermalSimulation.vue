<script setup lang="ts">
// This is the simulation of a system with a solar collector and a thermal
// storage tank. Water is heated by the sun in the solar collector then pumped
// into the top of the tank. Cold water is drawn from the bottom of the tank and
// piped back into the solar collector. The water in the tank is stratified,
// with the hotter water mainly floating on top of the colder water at the
// bottom of the tank.
//
// We will model the water as a bunch of nodes, each node representing a small
// segment of the water.

import { computed, reactive, onUnmounted } from 'vue';
import { last } from 'lodash-es';
import TemperatureGradient from './TemperatureGradient.vue';

// System Components Specs
//
// These specs are the recommended for a 4-person household in the mountain and
// south regions of the USA, according to
// https://www.solar365.com/solar/thermal/how-size-solar-thermal-storage-tank-and-collector-array

/** In meters^3. The volume of the thermal storage tank. */
const tankVolume = 300 / 1000; // Converted liters to m^3
/** In meters^2. The surface area of the solar collector. */
const collectorSurfaceArea = 5;
/** In meters^3. The volume of water in the solar collectors. This assumes that
 * the solar collector is always full of water (which assumes there is no
 * drainback tank in the system).
 *
 * This value was chosen because
 * https://www.solar365.com/solar/thermal/pipe-size-and-fluid-volume-solar-thermal-systems?page=0,0
 * says that some solar collectors can hold as much as 2 gallons. */
const volumeOfWaterInCollector = 0.007;
/** In meters^3/seconds. The flow rate of the pump, when the pump is on.
 *
 * This value was chosen because
 * https://www.solar365.com/solar/thermal/calculating-flow-rate-and-head-solar-thermal-systems?page=0,0
 * says 0.88 gallons per minute is good. */
const pumpFlowRateWhenOn = 0.0000555;

/** In meters^3. The volume of a discrete segment of water in the system. Even
 * though the water in this system is mostly continuous, we break it up into
 * segments for simulation purposes. */
const volumeOfWaterNode = 0.001; // 1 liter
/** In seconds. The time it takes for the pump to move one water node, when on. */
const pumpTimeToMoveOneNode = volumeOfWaterNode / pumpFlowRateWhenOn;
/** Number of water nodes that fit inside the solar collector. */
const collectorWaterNodeCount = Math.round(
  volumeOfWaterInCollector / volumeOfWaterNode,
);
assertVolumeIsAMultipleOfNodeVolume(
  volumeOfWaterInCollector,
  collectorWaterNodeCount,
  'solar collector',
);
/** Number of water nodes that fit inside the full thermal storage tank. */
const tankWaterNodeCount = Math.round(tankVolume / volumeOfWaterNode);
assertVolumeIsAMultipleOfNodeVolume(
  tankVolume,
  tankWaterNodeCount,
  'thermal storage tank',
);
/** Number of water nodes that fit inside each of the pipes. */
const pipeWaterNodeCount = 2;
/** In meters. The height of the thermal storage tank. */
const tankHeight = Math.cbrt(tankVolume) * 3;

/** The speed of the simulation. 400 is 400 times faster than real time. */
const simulationTimeDilation = 400;
/** In °C. For all the air that surrounds the system. */
const ambientAirTemperature = 20; // Room temperature
/** In °C. For all the water in the system at t=0. Let's start the temperature
 * at room temperature. */
const initialWaterTemperature = ambientAirTemperature;
const state = reactive({
  /** Whether the simulation is running. */
  simulationRunning: true,
  /** Whether pump is on. */
  pumpOn: true,
  /** In seconds. Time that has passed in the simulation. */
  t: 0,
  /** In watts/meters^2. The intensity of the suns rays. */
  solarIntensity: 1000,
  /** Array In °C. The temperatures of the water nodes in the solar collector.
   * The first node in the list is on the input/colder end of the solar
   * collector. The last node is on the output/warmer end. */
  collectorWaterNodeTemperatures: Array<number>(collectorWaterNodeCount).fill(
    initialWaterTemperature,
  ),
  /** Array in °C. The temperatures of the water nodes in the thermal storage
   * tank. The first node represents the water node at the top of the tank. The
   * last represents the node at the bottom. */
  tankWaterNodeTemperatures: Array<number>(tankWaterNodeCount).fill(
    initialWaterTemperature,
  ),
  /** Array in °C. The temperatures of the water nodes in the upper pipe. The
   * first node is at the input of the pipe. */
  upperPipeWaterNodeTemperatures: Array<number>(pipeWaterNodeCount).fill(
    initialWaterTemperature,
  ),
  /** Array in °C. The temperatures of the water nodes in the lower pipe. The
   * first node is at the input of the pipe. */
  lowerPipeWaterNodeTemperatures: Array<number>(pipeWaterNodeCount).fill(
    initialWaterTemperature,
  ),
});
const collectorInputTemperature = computed(
  () => last(state.lowerPipeWaterNodeTemperatures) as number,
);
const collectorOutputTemperature = computed(
  () => last(state.collectorWaterNodeTemperatures) as number,
);
/** The temperatures of the water nodes in the solar collector, reversed so that
 * the first node is at the output end of the collector. */
const reversedCollectorWaterNodeTemperatures = computed(() =>
  state.collectorWaterNodeTemperatures.slice().reverse(),
);

// Simulation control loop
const controlLoopSetInterval = setInterval(
  () => {
    if (state.simulationRunning) {
      /** Seconds of time step */
      const deltaTime = pumpTimeToMoveOneNode;
      state.t += deltaTime;
      if (state.pumpOn) {
        pumpOneWaterNode();
        mixColdWaterOnTopOfTankWithHotWaterBelow();
      }
      heatWaterInSolarCollector(deltaTime);
      manageHeatConductionAcrossTankWater(deltaTime);
      // Todo: Manage heat loss from the tank into the environment.
      // Todo: Manage heat loss from the pipes into the environment.
    }
  },
  (pumpTimeToMoveOneNode * 1000) / simulationTimeDilation,
);

// Cleanup
onUnmounted(() => clearInterval(controlLoopSetInterval));

/** Pump one node of water. This will push over all the other water nodes in the
 * system. */
function pumpOneWaterNode() {
  state.collectorWaterNodeTemperatures.unshift(
    state.lowerPipeWaterNodeTemperatures.pop() as number,
  );
  state.upperPipeWaterNodeTemperatures.unshift(
    state.collectorWaterNodeTemperatures.pop() as number,
  );
  state.tankWaterNodeTemperatures.unshift(
    state.upperPipeWaterNodeTemperatures.pop() as number,
  );
  state.lowerPipeWaterNodeTemperatures.unshift(
    state.tankWaterNodeTemperatures.pop() as number,
  );
}

/** This should be run each time a node is pumped into the top of the tank.
 *
 * This mixes the top water node of the thermal storage tank with the nodes
 * below it if the top node is cooler than the nodes below it. This is because
 * the cold water would quickly sink below the warm water and mix with it as it
 * sinks.
 *
 * This is according to the algorithm specified at
 * https://bigladdersoftware.com/epx/docs/24-1/engineering-reference/water-thermal-tanks-includes-water-heaters.html#inversion-mixing
 * except that we didn't bother to do a weighted average like that algorithm
 * said, even though a weighted average would probably be better. */
function mixColdWaterOnTopOfTankWithHotWaterBelow() {
  const nodes = state.tankWaterNodeTemperatures;
  if (nodes[0] >= nodes[1]) {
    // This shortcut will happen most of the time that the pump is on.
    return;
  }
  /** Number of nodes that we are sure we need to mix (average out the
   * temperatures for them), starting at the top of the tank. */
  let countOfNodesToMix = 2;
  let averageTemperatureOfNodesToMix = averageOfFirstNNumbers(
    nodes,
    countOfNodesToMix,
  );
  while (
    countOfNodesToMix < nodes.length &&
    averageTemperatureOfNodesToMix < nodes[countOfNodesToMix]
  ) {
    countOfNodesToMix++;
    averageTemperatureOfNodesToMix = averageOfFirstNNumbers(
      nodes,
      countOfNodesToMix,
    );
  }
  nodes.fill(averageTemperatureOfNodesToMix, 0, countOfNodesToMix);
}

if (import.meta.env.MODE === 'dev') {
  // Make things available to unit tests
  defineExpose({ state, mixColdWaterOnTopOfTankWithHotWaterBelow });
}

/** Returns the average of the first `n` numbers in an array. */
function averageOfFirstNNumbers(numbers: number[], n: number) {
  return average(numbers.slice(0, n));
}

function average(array: number[]) {
  return array.reduce((a, b) => a + b) / array.length;
}

/** In joules/(kg*degreeCelsius). The specific heat capacity of water. */
const specificHeatCapacityOfWater = 4186; // Todo: replace constant with a more accurate function dependent on temperature.
/** In kg/m^3. The density of water. */
const densityOfWater = 1000; // Todo: replace constant with a more accurate function dependent on temperature.
/** In Kg. The mass of the water in the solar collector. */
const collectorTotalWaterMass = volumeOfWaterInCollector * densityOfWater;

/** Heat the water in the solar collector. */
function heatWaterInSolarCollector(deltaTime: number) {
  /** In joules */
  const energyFromSun =
    // Todo: take into account the angle of the sun's rays. This assumes they
    // are perpendicular.
    state.solarIntensity * collectorSurfaceArea * deltaTime;

  /** In joules. Energy transferred to all the water. */
  const heatAddedToWater =
    energyFromSun *
    efficiencyOfSolarCollector(
      collectorOutputTemperature.value,
      ambientAirTemperature,
    );
  /** In °C. Temperature increase of each node of water. */
  const temperatureIncrease =
    heatAddedToWater / (collectorTotalWaterMass * specificHeatCapacityOfWater);
  state.collectorWaterNodeTemperatures.forEach((temp, i) => {
    state.collectorWaterNodeTemperatures[i] += temperatureIncrease;
  });
}

/** In Kg */
const massOfWaterNode = volumeOfWaterNode * densityOfWater;
/** In meters^2. The surface area of each of the water node's contact with the
 * other water nodes in the tank. Or in other words the cross-sectional area
 * of the tank. */
const contactAreaOfWaterNodeInTank = tankVolume / tankHeight;
/** In meters. */
const heightOfWaterNodeInTank = tankHeight / tankWaterNodeCount;

// Todo: Use the Crank-Nicolson Algorithm to make this stable and reliable even
// when the time step is large.
function manageHeatConductionAcrossTankWater(deltaTime: number) {
  /** In joules. The heat conducted out the top or bottom of each water node. */
  let conductedHeat: number[] =
    // Start with 0 because we will estimate the boundary condition of no heat
    // transferred from the top wall of the tank to the top water node.
    [0];
  const { length } = state.tankWaterNodeTemperatures;
  for (let i = 1; i < length; i++) {
    const deltaTemperature =
      state.tankWaterNodeTemperatures[i - 1] -
      state.tankWaterNodeTemperatures[i];
    const heatTransferred =
      deltaTemperature *
      (contactAreaOfWaterNodeInTank / heightOfWaterNodeInTank) *
      deltaTime;
    conductedHeat.push(heatTransferred);
  }
  // boundary condition of no heat transferred to the bottom wall of the tank
  conductedHeat.push(0);
  state.tankWaterNodeTemperatures = state.tankWaterNodeTemperatures.map(
    (temp, i) => {
      const netHeatChange = conductedHeat[i] - conductedHeat[i + 1];
      return (
        temp + netHeatChange / massOfWaterNode / specificHeatCapacityOfWater
      );
    },
  );
}

/** The efficiency of the solar collector.
 *
 * 1 as a return value would mean 100% efficient. The efficiency could become
 * negative, if the conditions became unfavorable enough. */
function efficiencyOfSolarCollector(
  solarCollectorOutputTemperature: number,
  ambientAirTemperature: number,
) {
  const differenceFromRoomTemp =
    solarCollectorOutputTemperature - ambientAirTemperature;
  // This formula was obtained from finding a best fit line to the data in the
  // graph on
  // https://solar365.com/solar/thermal/how-efficient-is-a-solar-collector for a
  // "Flat Plate" solar collector.
  return -0.00943 * differenceFromRoomTemp + 0.66;
}

function assertVolumeIsAMultipleOfNodeVolume(
  volume: number,
  nodeCount: number,
  componentName: string,
) {
  if (Math.abs(volume - nodeCount * volumeOfWaterNode) > 0.000001) {
    throw new Error(
      `The volume of water in the ${componentName} should be a multiple of \`volumeOfWaterNode\` to keep this code challenge simple.`,
    );
  }
}

/** Round to 2 decimal places */
function round(num: number) {
  return Math.round(num * 100) / 100;
}
</script>

<template>
  <button @click="state.simulationRunning = !state.simulationRunning">
    {{ state.simulationRunning ? 'Pause Simulation' : 'Resume Simulation' }}
  </button>
  <button @click="state.pumpOn = !state.pumpOn">
    Turn Pump {{ state.pumpOn ? 'Off' : 'On' }}
  </button>
  <p>
    <template v-if="state.simulationRunning">
      Simulation running at x{{ simulationTimeDilation }} speed.
    </template>
    t={{ Math.round(state.t) }} seconds ({{
      Math.floor(state.t / 60 / 60)
    }}
    hours {{ Math.floor((state.t / 60) % 60) }} min
    {{ Math.round(state.t % 60) }} s) <br />
    Solar Collector input water temperature
    {{ round(collectorInputTemperature) }}°C <br />
    Solar Collector output water temperature
    {{ round(collectorOutputTemperature) }}°C
  </p>
  <table>
    <tr>
      <th>Solar Collector</th>
      <th>Thermal Storage Tank</th>
    </tr>
    <tr></tr>
    <tr>
      <td>
        <TemperatureGradient
          :temperatures="reversedCollectorWaterNodeTemperatures"
        ></TemperatureGradient>
      </td>
      <td>
        <TemperatureGradient
          :temperatures="state.tankWaterNodeTemperatures"
        ></TemperatureGradient>
      </td>
    </tr>
  </table>
  <p>The same information as the above table, but in text form:</p>
  <p class="indent-1">
    Temperatures of water in different sections of the solar collector (water
    node temperatures): <br />
    <template v-for="temperature in reversedCollectorWaterNodeTemperatures">
      {{ round(temperature) }}°C <br />
    </template>
  </p>
  <p class="indent-1">
    Temperatures of the layers of water in the thermal storage tank, top to
    bottom (water node temperatures): <br />
    <template v-for="temperature in state.tankWaterNodeTemperatures">
      {{ round(temperature) }}°C <br />
    </template>
  </p>
</template>

<style scoped>
button:not(:last-of-type) {
  margin-right: 0.5rem;
}
td:deep(.thermal-gradient) {
  height: 12rem;
  width: 5rem;
  border-width: 2px;
  border-style: solid;
  border-radius: 4px;
}
.indent-1 {
  margin-left: 2rem;
}
</style>
