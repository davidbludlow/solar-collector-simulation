<script setup lang="ts">
import ThermalSimulation from './components/ThermalSimulation.vue';
</script>

<template>
  <main>
    <h1>Simulation Coding Challenge</h1>
    <img
      src="./assets/thermal-system-diagram.png"
      alt="Diagram of thermal system, containing a solar collector that supplies a thermal storage tank with hot water."
      style="max-width: 100%; display: block"
    />
    <ThermalSimulation></ThermalSimulation>
  </main>
</template>

<style scoped></style>
