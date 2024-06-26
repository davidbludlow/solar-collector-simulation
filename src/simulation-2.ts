import * as fs from 'fs';

// ----------------------------------------------------------------------
// Model Inputs
// ----------------------------------------------------------------------
const Tinitial = 20; // Initial Tank Fluid Temperature (degC)
const H = 1; // Tank Height (m)
const visc = 0.00070057; // Average Fluid Viscosity (m2/s)
const rhoH = 987.68; // Hot Water Density (kg/m3)
const rhoC = 997.78; // Cold Water Density (kg/m3)
const rho = 0.5 * (rhoH + rhoC); // Average Fluid Density (kg/m3)
const k = 0.62614; // Thermal Conductivity (W/mK)
const cp = 4068.5; // Specific Heat Capacity (J/kgK)
const beta = 0.00032452; // Thermal Expansion Coeff (1/K)
const alfa = k / (rho * cp); // Diffusivity (m2/s)
const g = 9.81; // Gravitational Acceleration (m/s2)
const u = 0.0001; // Mean Tank Fluid Velocity (m/s)
const N = 100; // Number of Tank Nodes

// ----------------------------------------------------------------------
// Read Input Temperature Data from Text File
// ----------------------------------------------------------------------
const inputData = fs
  .readFileSync('InputTemp.txt', 'utf8')
  .trim()
  .split('\n')
  .map((line) => line.split(' ').map(Number));
const TIMEin = inputData.map((row) => row[0]); // Read Time Step Values (s)
const Tin = inputData.map((row) => row[1]); // Read Inlet Temperature Values (degC)
const Length = TIMEin.length; // Set Number of Time Steps
const TinInitial = Tin[0]; // Read Initial Inlet Temp. (degC)
const ThermTime = [0]; // First Thermocline begins at t=0
const ThermTemp = [TinInitial]; // First Thermocline Hot Temperature (Initial Inlet Temp, degC)

// Determine times at which new thermocline is created (when temperature increases by 0.1 degC and the new hot temperature value for thermocline)
let A = 0;
let B = 1;
const TempIn: number[] = [];
for (let i = 1; i < Length; i++) {
  if (Math.abs(Tin[i] - Tin[B]) >= 0.01) {
    ThermTime.push(TIMEin[i]);
    TempIn.push(Tin[i]);
    A++;
    B = i;
  }
}

for (let i = 0; i < TempIn.length; i++) {
  if (i === TempIn.length - 1) {
    ThermTemp[i] = TempIn[i];
  } else {
    ThermTemp[i] = 0.5 * (TempIn[i] + TempIn[i + 1]);
  }
}

// Model Variable Calculations
const Tave = Array(ThermTime.length).fill(0);
const ThermInitial = Array(ThermTime.length).fill(0);
for (let i = 0; i < ThermTime.length; i++) {
  if (i === 0) {
    Tave[i] = 0.5 * (Tinitial + ThermTemp[i]);
    ThermInitial[i] = Tinitial;
  } else {
    Tave[i] = 0.5 * (ThermTemp[i - 1] + ThermTemp[i]);
    ThermInitial[i] = ThermTemp[i - 1];
  }
}

// Simulation Parameters
const tEND = Length; // Final Time Step number
const delt = TIMEin[1] - TIMEin[0]; // Time Step Size (s)
const t = TIMEin; // Simulation times at each time step (s)
const x = Array.from({ length: N }, (_, i) => H / (2 * N) + i * (H / N)); // Node Locations (m)

// Thermocline Thickness Variables
const C = Array.from({ length: tEND }, (_, i) => t[i] * u); // Initial Thermocline Location (m)
const T: number[][] = Array(tEND)
  .fill(0)
  .map(() => Array(N * ThermTime.length).fill(0));

const kIndex = 0;
for (let i = 1; i < ThermTime.length; i++) {
  for (let j = 0; j < tEND; j++) {
    if (t[j] <= ThermTime[i]) {
      C[j * ThermTime.length + i] = 0;
    } else {
      C[j * ThermTime.length + i] = u * (t[j] - ThermTime[i]);
    }
  }
}

// Thermocline Profile Calculation
let m = 0;
for (let h = 0; h < ThermTime.length; h++) {
  for (let i = 0; i < tEND; i++) {
    for (let j = 0; j < N; j++) {
      if (h === 0) {
        if (x[j] > C[i * ThermTime.length + h]) {
          T[i][j] =
            Tave[h] +
            (ThermInitial[h] - Tave[h]) *
              erf(
                (x[j] - C[i * ThermTime.length + h]) /
                  Math.sqrt(4 * alfa * t[i]),
              );
        } else {
          T[i][j] =
            ThermInitial[h] +
            ThermTemp[h] -
            (Tave[h] +
              (ThermInitial[h] - Tave[h]) *
                erf(
                  (C[i * ThermTime.length + h] - x[j]) /
                    Math.sqrt(4 * alfa * t[i]),
                ));
        }
      } else {
        if (t[i] < ThermTime[h]) {
          T[i][j + m] = ThermTemp[h - 1];
        } else {
          if (x[j] > C[i * ThermTime.length + h]) {
            T[i][j + m] =
              Tave[h] +
              (ThermInitial[h] - Tave[h]) *
                erf(
                  (x[j] - C[i * ThermTime.length + h]) /
                    Math.sqrt(4 * alfa * (t[i] - ThermTime[h])),
                );
          } else {
            T[i][j + m] =
              ThermInitial[h] +
              ThermTemp[h] -
              (Tave[h] +
                (ThermInitial[h] - Tave[h]) *
                  erf(
                    (C[i * ThermTime.length + h] - x[j]) /
                      Math.sqrt(4 * alfa * (t[i] - ThermTime[h])),
                  ));
          }
        }
      }
    }
  }
  m += N;
}

// Final Temperature Profile (Substitution)
const Tfinal: number[][] = Array(tEND)
  .fill(0)
  .map(() => Array(N).fill(0));
for (let i = 0; i < tEND; i++) {
  for (let j = 0; j < N; j++) {
    Tfinal[i][j] = T[i][j + N * (ThermTime.length - 1)];
    for (let h = ThermTime.length - 1; h >= 1; h--) {
      Tfinal[i][j] += T[i][j + N * (h - 2)] - ThermInitial[h];
    }
  }
}

// Error Function (erf) Implementation
function erf(x: number): number {
  // constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save the sign of x
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}
