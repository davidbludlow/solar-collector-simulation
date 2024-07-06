import { describe, it, expect } from 'vitest';

import { mount } from '@vue/test-utils';
import ThermalSimulation from '../ThermalSimulation.vue';

describe('ThermalSimulation', () => {
  it('mixColdWaterOnTopOfTankWithHotWaterBelow', () => {
    const wrapper = mount(ThermalSimulation);
    const { vm } = wrapper;
    t([5, 5, 5, 5, 5], [5, 5, 5, 5, 5]);
    t([1, 6, 6, 6, 6], [5, 5, 5, 5, 5]);
    t([5, 2, 2, 2, 2], [5, 2, 2, 2, 2]);
    t([2, 5, 5, 1, 1], [4, 4, 4, 1, 1]);
    t([2, 6, 4, 4, 3], [4, 4, 4, 4, 3]);
    wrapper.unmount();

    function t(input: number[], expectedOutput: number[]) {
      vm.state.tankWaterNodeTemperatures = input;
      vm.mixColdWaterOnTopOfTankWithHotWaterBelow();
      expect(vm.state.tankWaterNodeTemperatures).toEqual(expectedOutput);
    }
  });
});
