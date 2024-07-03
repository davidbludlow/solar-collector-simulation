<template>
  <div class="solar-system">
    <div class="sun">☀️</div>
    <div class="pipe pipe-left"></div>
    <div class="solar-collector">
      <div class="collector-gradient"></div>
      <span>Solar Collector</span>
    </div>
    <div class="pipe pipe-middle-left"></div>
    <div class="pump">
      <div class="arrow">➡️</div>
      <span>Pump</span>
    </div>
    <div class="pipe pipe-middle-right"></div>
    <div class="storage-tank">
      <div v-for="n in 10" :key="n" :style="{ backgroundColor: getColor(n) }" class="rectangle"></div>
      <span>Storage Tank</span>
    </div>
    <div class="pipe pipe-right"></div>
  </div>
</template>

<script>
export default {
  name: 'SolarSystem',
  methods: {
    getColor(n) {
      const red = 255 - (n - 1) * 25;
      const green = (n - 1) * 12;
      const blue = (n - 1) * 12;
      return `rgb(${red},${green},${blue})`;
    },
  },
};
</script>

<style scoped>
.solar-system {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 900px;
  height: 300px;
  position: relative;
  border: 1px solid #ccc;
  margin: 0 auto;
}

.sun {
  position: absolute;
  top: -50px;
  left: 10px;
  font-size: 30px;
}

.solar-collector {
  width: 100px;
  height: 150px;
  border: 1px solid #000;
  position: relative;
  text-align: center;
}

.collector-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, red, blue);
}

.solar-collector span {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
}

.pipe {
  width: 100px;
  height: 5px;
  background: yellow;
  position: relative;
}

.pipe-left {
  position: absolute;
  left: 130px;
  top: 95px;
}

.pipe-middle-left {
  width: 50px;
}

.pipe-middle-right {
  width: 50px;
}

.pipe-right {
  position: absolute;
  right: 130px;
  top: 95px;
}

.pump {
  width: 50px;
  height: 50px;
  border: 1px solid #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.arrow {
  font-size: 20px;
}

.storage-tank {
  width: 100px;
  height: 200px;
  border: 1px solid #000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.storage-tank span {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
}

.rectangle {
  width: 100%;
  height: 20px;
}
</style>
