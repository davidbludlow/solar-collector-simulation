<script setup lang="ts">
import ThermalSimulation from './components/ThermalSimulation.vue';
</script>

<template>
  <main>
    <h1>Simulation Coding Challenge</h1>
    <p>
      David Ludlow created this simulation as a coding challenge to apply for a
      job. The source code of the heart of the simulation can be found at
      <a
        href="https://github.com/davidbludlow/solar-collector-simulation/blob/main/src/components/ThermalSimulation.vue"
        target="_blank"
        >https://github.com/davidbludlow/solar-collector-simulation/blob/main/src/components/ThermalSimulation.vue</a
      >
    </p>
    <img
      src="./assets/thermal-system-diagram.png"
      alt="Diagram of thermal system, containing a solar collector that supplies a thermal storage tank with hot water."
      style="max-width: 100%; display: block"
    />
    <ThermalSimulation></ThermalSimulation>
  </main>
</template>

<style scoped></style>
