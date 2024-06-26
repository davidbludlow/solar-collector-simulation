% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
% Model Inputs
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
Tinitial = 20; % Initial Tank Fluid 
 % Temperature (degC)
H = 1; % Tank Height (m)
visc = 0.00070057; % Average Fluid Viscosity 
 % (m2/s)
rhoH = 987.68; % Hot Water Density (kg/m3)
rhoC = 997.78; % Cold Water Density (kg/m3)
rho = 0.5*(rhoH + rhoC); % Average Fluid Density 
 % (kg/m3)
k = 0.62614; % Thermal Conductivity 
 % (W/mK)
cp = 4068.5; % Specific Heat Capacity 
 % (J/kgK)
beta = 0.00032452; % Thermal Expansion Coeff 
 % (1/K)
alfa = k/(rho*cp); % Diffusivity (m2/s) 
g = 9.81; % Gravitational Acceration 
 % (m/s2)
u = 0.0001; % Mean Tank Fluid Velocity 
 % (m/s)
N = 100; % Number of Tank Nodes
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
% Read Input Temperature Data from Text File 
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
load('InputTemp.txt') % Load input file
TIMEin = InputTemp(1:end,1); % Read Time Step Values (s)
Tin = InputTemp(1:end,2); % Read Inlet Temperature 
 % Values (degC)
Length = length(TIMEin); % Set Number of Time Steps
TinInitial = Tin(1,1); % Read Initial Inlet Temp. 
 % (degC)
ThermTime(1,1) = 0; % First Thermocline begins 
 % at t=0
ThermTemp(1,1) = TinInitial; % First Thermocline Hot 
 % Temperature (Initial Inlet 
 % Temp, degC)

% Determine times at which new thermocline is created (when temperature
% increases by 0.1 degC and the new hot temperature value for 
% thermocline)
% ----------------------------------------------------------------------
A = 0;
B = 1;
for i = 2:Length
 if abs(Tin(i,1) - Tin(B,1)) >= 0.01
 ThermTime((2+A),1) = TIMEin(i,1);
 TempIn((2+A),1) = Tin(i,1);
 A = A + 1;
 B = i;
 end
end
for i = 1:length(TempIn)
 if i == length(TempIn)
 ThermTemp(i,1) = TempIn(i,1);
 else
 ThermTemp(i,1) = 0.5*(TempIn(i,1) + TempIn(i+1,1));
 end
end
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
% Model Variable Calculations
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
% THERMOCLINE TEMPERATURES
% ----------------------------------------------------------------------
Tave(1:length(ThermTime),1) = 0;
ThermInitial(1:length(ThermTime),1) = 0;
for i = 1:length(ThermTime)
 if i == 1 
 Tave(i,1) = 0.5*(Tinitial + ThermTemp(i,1));
 ThermInitial(i,1) = Tinitial;
 else
 Tave(i,1) = 0.5*(ThermTemp(i-1,1) + ThermTemp(i,1));
 ThermInitial(i,1) = ThermTemp(i-1,1);
 end
end
% SIMULATION PARAMETERS
% ----------------------------------------------------------------------
tEND = Length; % Final Time Step number
delt = TIMEin(2,1) - TIMEin(1,1); % Time Step Size (s)

t = TIMEin; % Simulation times at each 
 % time step (s)
x(1:N,1) = (H/(2*N)):(H/N):(H-H/(2*N)); % Node Locations (m)
% THERMOCLINE THICKNESS VARIABLES
% ----------------------------------------------------------------------
C(1:tEND,1) = t.*u; % Initial Thermocline 
 % Location (m)
k = 0; 
for i = 2:length(ThermTime)
 T(1:tEND,(1+k):(N+k)) = 0;
 k = k + N;
 for j = 1:tEND
 if t(j,1) <= ThermTime(i,1) % Determine when each 
 % thermocline moves through 
 % tank
 C(j,i) = 0; 
 else
 C(j,i) = u*(t(j,1) - ThermTime(i,1));
 end
 end
end
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
% Thermocline Profile Calculation
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
m = 0;
for h = 1:length(ThermTime)
 for i = 1:tEND
 for j = 1:N
 if h == 1
 if x(j,1) > C(i,h)
 T(i,j) = Tave(h,1) + (ThermInitial(h,1) -
Tave(h,1))*erf((x(j,1)-C(i,h))/sqrt(4*alfa*t(i,1)));
 elseif x(j,1) <= C(i,h)
 T(i,j) = (ThermInitial(h,1)+ThermTemp(h,1)) -
(Tave(h,1) + (ThermInitial(h,1) - Tave(h,1))*erf((C(i,h)-
x(j,1))/sqrt(4*alfa*t(i,1))));
 end
 else
 if t(i,1) < ThermTime(h,1)
 T(i,j+m) = ThermTemp(h-1,1);
 else
 if x(j,1) > C(i,h)

 T(i,j+m) = Tave(h,1) + (ThermInitial(h,1) -
Tave(h,1))*erf((x(j,1)-C(i,h))/sqrt(4*alfa*(t(i,1)-ThermTime(h,1))));
 elseif x(j,1) <= C(i,h)
 T(i,j+m) = (ThermInitial(h,1)+ThermTemp(h,1)) -
(Tave(h,1) + (ThermInitial(h,1) - Tave(h,1))*erf((C(i,h)-
x(j,1))/sqrt(4*alfa*(t(i,1)-ThermTime(h,1)))));
 end
 end
 end
 end
 end
 m = m+N;
end
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
% Final Temperature Profile (Substitution)
% ----------------------------------------------------------------------
% ----------------------------------------------------------------------
Tfinal(1:tEND,1:N) = 0;
for i = 1:tEND
 for j = 1:N
 Tfinal(i,j) = T(i,j+N*(length(ThermTime)-1));
 for h = length(ThermTime):-1:2
 Tfinal(i,j) = Tfinal(i,j) + T(i,j+N*(h-2)) -
ThermInitial(h,1);
 end
 end
end