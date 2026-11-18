const { json } = require('./_lib/data');

const text = value => String(value || '').trim();
const has = (input, words) => words.some(word => input.includes(word));

function categoryFor(problem) {
  const input = problem.toLowerCase();
  if (has(input, ['a/c', ' ac ', 'air con', 'aircon', 'air condition', 'not cold', 'warm air', 'blower', 'cabin fan'])) return 'ac';
  if (has(input, ['brake', 'squeal', 'stopping', 'pedal'])) return 'brakes';
  if (has(input, ['wont start', "won't start", 'not start', 'battery', 'clicking', 'crank', 'dead'])) return 'starting';
  if (has(input, ['overheat', 'temperature', 'coolant', 'radiator', 'steam'])) return 'cooling';
  if (has(input, ['gear', 'transmission', 'clutch', 'shifting', 'shift'])) return 'transmission';
  if (has(input, ['shake', 'shaking', 'vibrat', 'stall', 'rough idle', 'misfire', 'engine light', 'loss of power'])) return 'engine';
  if (has(input, ['steer', 'suspension', 'clunk', 'knock', 'bump', 'pulling'])) return 'suspension';
  if (has(input, ['smoke', 'smell', 'exhaust', 'burning'])) return 'smell';
  if (has(input, ['light', 'electrical', 'window', 'radio', 'screen', 'fuse'])) return 'electrical';
  return 'general';
}

const flows = {
  ac: {
    question: 'What happens when you switch the A/C on?',
    choices: [
      ['warm', 'Air blows, but stays warm'], ['weak', 'Very little air comes out'],
      ['stops', 'It cools, then stops'], ['noise', 'There is a new noise']
    ],
    results: {
      warm: ['Refrigerant leak or compressor-control fault', 'The system is moving air but is not removing heat. Low refrigerant from a leak is common; a pressure sensor, compressor clutch or compressor fault is also possible.', ['Refrigerant circuit', 'Condenser and pipe seals', 'Pressure sensor', 'Compressor or clutch'], ['Measure vent temperature and system pressures', 'Leak-test before adding refrigerant', 'Check compressor command and electrical supply'], 'Find and repair any leak first, then recharge to the specified weight. Replace a component only after the pressure and electrical tests identify it.', 'Book an inspection', 'Can you show me the pressure readings and the leak location before replacing the compressor?'],
      weak: ['Restricted cabin airflow', 'Weak airflow usually points to the air path rather than the refrigerant circuit.', ['Cabin air filter', 'Blower motor', 'Blower resistor/controller', 'Evaporator housing'], ['Inspect the cabin filter', 'Test every fan speed', 'Check blower voltage and current'], 'Replace a blocked filter or repair the confirmed blower fault. A refrigerant recharge will not fix low airflow.', 'Check soon', 'Can you test the blower and filter before opening the refrigerant system?'],
      stops: ['Low charge, pressure-sensor fault or evaporator icing', 'Cooling that fades can happen when pressure drops, the evaporator freezes, or a sensor switches the compressor off.', ['Refrigerant circuit', 'Pressure sensor', 'Evaporator temperature sensor', 'Compressor clutch'], ['Record high- and low-side pressures while the fault occurs', 'Check evaporator temperature', 'Scan climate-control fault codes'], 'Repair the confirmed leak, sensor or control fault; recharge only after leak testing.', 'Book an inspection', 'Can you reproduce the fault and record the pressures before recommending parts?'],
      noise: ['A/C compressor, clutch or blower noise', 'The location and timing of the noise separates an engine-bay compressor fault from an interior blower fault.', ['Compressor pulley/bearing', 'Compressor clutch', 'Drive belt', 'Blower motor'], ['Listen with A/C off and on', 'Inspect belt and pulley movement', 'Test the blower at each speed'], 'Replace only the noisy confirmed component; a complete compressor may not be necessary if the clutch or bearing is serviceable.', 'Check soon', 'Can you identify whether the noise is from the blower, clutch or compressor itself?']
    }
  },
  brakes: {
    question: 'Which braking symptom is closest?',
    choices: [['noise', 'Squeal or grinding'], ['vibration', 'Steering or pedal vibration'], ['soft', 'Soft or sinking pedal'], ['warning', 'Brake warning light']],
    results: {
      noise: ['Brake friction wear or trapped debris', 'Noise can come from worn pads, glazed surfaces or debris. Pad and disc measurements are needed before replacement.', ['Brake pads', 'Brake discs', 'Pad hardware'], ['Measure pad thickness', 'Measure disc thickness and runout', 'Inspect both sides for debris or uneven wear'], 'Clean and service the hardware or replace parts that are below specification.', 'Check this week', 'Can you show me the pad and disc measurements before replacing anything?'],
      vibration: ['Brake disc runout or suspension play', 'Vibration during braking may come from uneven disc thickness, but wheel or suspension play can feel similar.', ['Brake discs', 'Wheel hubs', 'Control-arm bushes'], ['Measure disc runout', 'Check hub cleanliness and wheel torque', 'Inspect suspension play'], 'Correct the measured cause; do not replace discs solely from a road-test impression.', 'Check soon', 'What runout measurement confirms the discs are the cause?'],
      soft: ['Hydraulic pressure loss', 'A soft or sinking pedal can indicate air, fluid leakage or a hydraulic component fault.', ['Brake fluid and hoses', 'Master cylinder', 'Calipers or wheel cylinders'], ['Check fluid level and visible leaks', 'Pressure-test the hydraulic system', 'Inspect pad travel and calipers'], 'Repair the leak or failed hydraulic component and bleed the system.', 'Do not drive if braking is reduced', 'Where is pressure being lost, and can you show me the leak or test result?'],
      warning: ['Brake/ABS system fault', 'The warning may be caused by low fluid, a wheel-speed sensor or an ABS control fault.', ['Brake fluid level sensor', 'Wheel-speed sensors and wiring', 'ABS module'], ['Read ABS fault codes', 'Check fluid level and leaks', 'Inspect sensor wiring'], 'Repair the code-confirmed fault after verifying wiring and supply voltage.', 'Check immediately', 'What fault code and test result identify the failed part?']
    }
  },
  starting: {
    question: 'What happens when you try to start it?',
    choices: [['silent', 'Nothing happens'], ['click', 'It clicks'], ['cranks', 'Engine turns but will not start'], ['slow', 'It turns slowly']],
    results: {
      silent: ['Battery connection, start switch or starter circuit fault', 'No response can be caused by poor battery connections, an interlock/start switch, relay or starter circuit.', ['Battery terminals', 'Starter relay and wiring', 'Ignition/start switch', 'Starter motor'], ['Measure battery voltage', 'Check terminal voltage drop', 'Verify starter relay command'], 'Repair the failed connection or tested circuit component.', 'Check soon', 'Can you show me the battery and starter voltage-drop results?'],
      click: ['Low battery voltage or starter fault', 'A click with no cranking often means the voltage collapses under load or the starter cannot turn.', ['Battery', 'Battery cables', 'Starter solenoid/motor'], ['Load-test the battery', 'Measure cable voltage drop', 'Test starter current draw'], 'Charge or replace a failed battery; replace the starter only if current and voltage tests confirm it.', 'Check soon', 'Did the battery pass a load test, and what was starter current draw?'],
      cranks: ['Fuel, ignition or engine-sensor fault', 'Normal cranking without starting needs fault-code, spark and fuel-pressure checks.', ['Fuel pump/circuit', 'Crank/cam sensors', 'Ignition system'], ['Scan engine fault codes', 'Check RPM signal while cranking', 'Test spark and fuel pressure'], 'Repair the failed tested circuit; avoid replacing sensors from a code alone.', 'Book an inspection', 'Which test shows whether spark, fuel pressure or RPM signal is missing?'],
      slow: ['Weak battery, cable resistance or starter drag', 'Slow cranking is usually a power-delivery problem, though mechanical drag is possible.', ['Battery', 'Battery cables and grounds', 'Starter motor'], ['Load-test battery', 'Measure positive and ground voltage drop', 'Measure starter current'], 'Repair the connection or replace the component that fails the measured test.', 'Check soon', 'Can you provide the battery, voltage-drop and starter-current readings?']
    }
  }
};

const generic = {
  cooling: ['Cooling-system fault', ['Coolant circuit', 'Thermostat', 'Radiator fan', 'Water pump'], 'Stop driving if the temperature rises or steam appears.'],
  transmission: ['Transmission or clutch-control fault', ['Transmission fluid/circuit', 'Clutch or actuator', 'Shift sensors'], 'Avoid driving if the vehicle slips, will not engage, or loses drive.'],
  engine: ['Engine running fault', ['Ignition coils and plugs', 'Fuel/air metering', 'Engine sensors and mounts'], 'A flashing engine warning light or severe power loss needs immediate attention.'],
  suspension: ['Steering or suspension wear', ['Tyres and wheel fasteners', 'Bushes and joints', 'Struts and steering gear'], 'Stop driving if steering is loose or the vehicle is unstable.'],
  smell: ['Fluid leak or overheating component', ['Engine fluids', 'Fuel and exhaust system', 'Electrical wiring'], 'Stop and switch off for fuel smell, smoke or a strong electrical burning smell.'],
  electrical: ['Electrical supply or circuit fault', ['Battery and charging system', 'Fuses and wiring', 'Control modules'], 'Check promptly if safety lights, starting or charging are affected.'],
  general: ['Inspection needed to isolate the system', ['Fault-code scan', 'Fluid and visual inspection', 'Road-test observations'], 'Stop driving if there is smoke, overheating, reduced braking or unsafe steering.']
};

function genericFlow(category) {
  const [title, parts, safety] = generic[category] || generic.general;
  return {
    question: 'When is the symptom easiest to reproduce?',
    choices: [['startup', 'At startup'], ['idle', 'While idling'], ['driving', 'While driving'], ['constant', 'All the time']],
    result: [title, 'The description identifies a system to inspect, but not one proven failed part. Reproducing the symptom and measuring the system is the next useful step.', parts, ['Scan relevant control modules', 'Inspect fluids, wiring and visible wear', 'Reproduce the symptom on a controlled test'], 'Test the system before approving replacement parts.', 'Book an inspection', 'What test result proves which part has failed?', safety]
  };
}

function diagnosisObject(result, safetyOverride) {
  const [title, explanation, parts, checks, action, urgency, garageQuestion, safety] = result;
  return { title, explanation, parts, checks, action, urgency, garageQuestion, safety: safety || safetyOverride || 'Stop driving if the vehicle feels unsafe.' };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const problem = text(req.body?.problem);
  if (!problem) return json(res, 400, { error: 'Describe the symptom first.' });
  const category = text(req.body?.category) || categoryFor(` ${problem} `);
  const flow = flows[category] || genericFlow(category);
  const answer = text(req.body?.answer);
  if (!answer) return json(res, 200, { stage: 'question', category, question: flow.question, choices: flow.choices.map(([id, label]) => ({ id, label })) });
  const selected = flow.results?.[answer] || flow.result;
  if (!selected) return json(res, 400, { error: 'Choose one of the available answers.' });
  return json(res, 200, { stage: 'result', category, diagnosis: diagnosisObject(selected) });
};
