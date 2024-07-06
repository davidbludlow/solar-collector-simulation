<!-- A series of rectangles that show the temperature at different locations.
Use the `thermal-gradient` class on the topmost div to control its size. -->

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** The temperatures to show. The first temperature will be at the top. */
    temperatures: number[];
    /** The temperature at which the color will be blue. Temperatures below this
     * will be blue. @default 20 */
    blueTemperature?: number;
    /** The temperature at which the color will be red. Temperatures above this
     * will be red. @default 90 */
    redTemperature?: number;
  }>(),
  { blueTemperature: 20, redTemperature: 90 },
);

/** Calculates a color to show temperature. */
function temperatureToColor(temperature: number): string {
  const blue = [0, 130, 255];
  const red = [255, 0, 0];
  const fractionOfTempTowardsRed = Math.max(
    0,
    Math.min(
      1,
      (temperature - props.blueTemperature) /
        (props.redTemperature - props.blueTemperature),
    ),
  );
  // Mix `blue` and `red`, according to `fractionOfTempTowardsRed`
  const color = blue.map((blueValue, index) =>
    Math.round(blueValue + fractionOfTempTowardsRed * (red[index] - blueValue)),
  );
  return `rgb(${color.join(',')})`;
}
</script>

<template>
  <div class="thermal-gradient">
    <div
      v-for="(temperature, index) in props.temperatures"
      :key="index"
      :style="{
        backgroundColor: temperatureToColor(temperature),
        flex: 1,
      }"
    ></div>
  </div>
</template>

<style scoped>
.thermal-gradient {
  display: flex;
  flex-direction: column;
}
</style>
