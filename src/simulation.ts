// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Model Inputs
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
const Th = 50; // Hot Temperature (C)
const Tc = 20; // Cold Temperature (C)
const Tave = (Th + Tc) / 2; // Average Temperature (C)
const mf = 0.001; // Mass Flow Rate (kg/s)
const H = 1; // Tank Height (m)
const Dtank = 0.3; // Tank Diameter (m)
const Dpipe = 0.01; // Inlet Pipe Diameter (m)
const visc = 0.00070057; // Average Fluid Viscosity (m2/s)

const rhoH = 987.68; // Hot Water Density (kg/m3)
const rhoC = 997.78; // Cold Water Density (kg/m3)
const rho = 0.5 * (rhoH + rhoC); // Average Fluid Density (kg/m3)
const k = 0.62614; // Thermal Conductivity (W/mK)
const cp = 4068.5; // Specific Heat Capacity (J/kgK)
const beta = 0.00032452; // Thermal Expansion Coeff. (1/K)
const alfa = k / (rho * cp); // Diffusivity (m2/s)
const N = 100; // Number of Nodes
const delt = 1; // Time Step Size (s)
const tTotal = 7200; // Total Simulation Time (s)
const g = 9.81; // Gravitational Acceleration (m/s2)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Calculate Model Variables
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
const Q = mf / rho; // Volumetric Flow Rate (m3/s)
const Ac = (Math.PI / 4) * Dtank ** 2; // Tank Cross-section area (m2)
const u = mf / (rho * (Math.PI / 4) * Dtank ** 2); // Mean Flow Velocity (m/s)
const uIN = mf / (rhoH * (Math.PI / 4) * Dpipe ** 2); // Inlet Pipe Velocity (m/s)
const x = Array.from({ length: N }, (_, i) => H / (2 * N) + i * (H / N)); // Node Locations
const tEND = Math.floor(tTotal / delt) + 1; // Last Time Step Value
const t = Array.from({ length: tEND }, (_, i) => i * delt); // Simulation time at each time step (s)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Initial Jet Penetration Depth and Plume Velocity (from Nizami [12])
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// NIZAMI CONSTANTS
const dpipe_mm = Dpipe * 1000; // Inlet Pipe Diameter (mm)
const ahj = -0.015 * dpipe_mm ** 2 + 1.4 * dpipe_mm + 0.51; // Penetration Depth Parameter a
const bhj = 0.00535 * dpipe_mm + 0.448; // Penetration Depth Parameter b
// MODELING CONSTANTS
const Rio = (g * beta * Dpipe * (Th - Tc)) / uIN ** 2; // Initial Richardson Number

const hIo = (ahj / 1000) * Rio ** -bhj; // Initial Penetration Depth
// INLET PLUME VELOCITY (NIZAMI METHOD)
const mfp = mf * 1.062 * Rio ** -0.278; // Inlet Plume Mass Flow Rate (kg/s)
const up = mfp / (rho * (Math.PI / 4) * Dtank ** 2); // Inlet Plume Velocity (m/s)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Time Interval 1 (0<t<to)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Determine TI and hj for 0<t<to:
// ----------------------------------------------------------------------
const A2 = (Math.PI / 4) * (Dtank ** 2 - (3 * Dpipe) ** 2); // Cross-sectional Area of Region 2 (m2)
const V1 = (Math.PI / 4) * (3 * Dpipe) ** 2 * hIo; // Volume of Region 1 (m3)
const Ci = 0.00001; // Initial Thermocline Location (m)
const Tau1 = (-rho * V1) / mfp; // Time Constant for Region 1
const CT2 = Tc * rho * A2 * Ci + mf * (Th - Tc) * Tau1; // Constant Term for Region 2

const T2Top = new Array(tEND).fill(0);
const T2Bot = new Array(tEND).fill(0);
const T2 = new Array(tEND).fill(0);
const Co = new Array(tEND).fill(0);
const TIo = Array.from({ length: tEND }, () => new Array(101).fill(0));
const h = Array.from({ length: tEND }, () => new Array(101).fill(0));
const Ri = new Array(tEND).fill(0);
const hj = new Array(tEND).fill(0);

for (let i = 0; i < tEND; i++) {
  T2Top[i] =
    mfp * Tc * t[i] +
    mf * (Th - Tc) * (t[i] - Tau1 * Math.exp(t[i] / Tau1)) +
    CT2;
  T2Bot[i] = mfp * t[i] + rho * A2 * Ci;
  T2[i] = T2Top[i] / T2Bot[i]; // Temperature of Region 2

  Co[i] = (mfp / (A2 * rho)) * t[i] + Ci; // Location of Thermocline

  if (i === 0) {
    TIo[i][0] = Tave;
  } else {
    TIo[i][0] = TIo[i - 1][100];
  }

  // Iterate to solve for the jet penetration depth, h, and inlet mixing region temperature, TIo:
  for (let j = 0; j < 100; j++) {
    h[i][j] =
      (ahj / 1000) * ((g * beta * (Th - TIo[i][j]) * Dpipe) / uIN ** 2) ** -bhj;
    TIo[i][j + 1] = (Co[i] * T2[i] + (h[i][j] - Co[i]) * Tc) / h[i][j];
  }

  Ri[i] = (g * beta * (Th - TIo[i][100]) * Dpipe) / uIN ** 2;
  hj[i] = h[i][100];
}

// Calculate end of time interval 1, to
// ----------------------------------------------------------------------
let n = 0;
for (let i = 1; i < tEND; i++) {
  if (hj[i] <= Co[i]) {
    // Determine when thermocline passes jet penetration depth
    n = i - 1;
    break;
  }
}

// Determine time at end of time interval 1, to:
const to =
  t[n] +
  ((hj[n] - Co[n]) * (t[n + 1] - t[n])) /
    (Co[n + 1] - Co[n] - (hj[n + 1] - hj[n]));
const TIto = TIo[n][100]; // Temperature at the end of time interval 1 (degC)
const hto = hj[n]; // Jet Penetration Depth at end of time interval 1 (m)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Time Interval 2 (t>to)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Determine inlet mixing region temperature, TI, for t>to
// ----------------------------------------------------------------------
const CTIn = TIto * hto - (mf * Th * hto) / (rho * Ac);
const TIn = new Array(tEND).fill(0);
for (let i = 0; i < tEND; i++) {
  TIn[i] = ((mf * Th * t[i]) / (rho * Ac) + CTIn) / (u * (t[i] - to) + hto);
}
// Determine Overall TI
// ----------------------------------------------------------------------
const TI = new Array(tEND).fill(0);
for (let i = 0; i < tEND; i++) {
  if (i <= n) {
    TI[i] = T2[i];
  } else {
    TI[i] = TIn[i];
  }
}
// Thermocline Location for t>to
// ----------------------------------------------------------------------
const C = new Array(tEND).fill(0);
for (let i = 0; i < tEND; i++) {
  if (t[i] <= to) {
    C[i] = u * t[i] + Ci;
  } else {
    C[i] = C[i - 1] + u * delt;
  }
}
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Final Temperature Profile Calculation - Thermocline Thickness Method
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
const TaveS = new Array(tEND).fill(0);
for (let i = 0; i < tEND; i++) {
  TaveS[i] = 0.5 * (TI[i] + Tc);
}
const time = new Array(tEND).fill(0);
time[1] = delt;

const Tth = Array.from({ length: tEND }, () => new Array(N).fill(0));
Tth[0][0] = Tc;

for (let i = 1; i < tEND; i++) {
  for (let j = 0; j < N; j++) {
    if (x[j] > C[i]) {
      // Below Thermocline
      Tth[i][j] =
        TaveS[i] +
        (Tc - TaveS[i]) *
          Math.erf((x[j] - C[i]) / Math.sqrt(4 * alfa * time[i]));
    } else {
      // Above Thermocline
      Tth[i][j] =
        Tc +
        TI[i] -
        (TaveS[i] +
          (Tc - TaveS[i]) *
            Math.erf((C[i] - x[j]) / Math.sqrt(4 * alfa * time[i])));
    }
  }

  // Determine Thermocline Thickness at the end of the time step
  const Wth =
    2 *
    Math.sqrt(4 * alfa * time[i]) *
    Math.erfinv(1 + 0.001 * (Tc / (Tc - TaveS[i])));

  // Determine Time for profile with temperatures of next time step to obtain the same thermocline thickness
  const tnew =
    (1 / (4 * alfa)) *
    (Wth / (2 * Math.erfinv(1 + 0.001 * (Tc / (Tc - TaveS[i + 1]))))) ** 2;

  // Calculate next 'fictitious' simulation time value
  time[i + 1] = tnew + delt;
}
