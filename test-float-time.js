// Simulate float time calculation with varying segment velocities
// to understand the non-linear behavior

// Match Liam's exact route: 5.1 miles, 0.6 mph avg water, 8h 43m at 0 paddle
// 5.1 mi / 8.717 hr = 0.585 mph harmonic avg
// These segments approximate a real river with velocity variation
const segments = [
  { lengthMiles: 1.5, waterSpeedMph: 0.25 },  // Very slow pools
  { lengthMiles: 1.5, waterSpeedMph: 0.5 },   // Slow section  
  { lengthMiles: 1.0, waterSpeedMph: 0.8 },   // Medium section
  { lengthMiles: 0.7, waterSpeedMph: 1.2 },   // Riffle section
  { lengthMiles: 0.4, waterSpeedMph: 1.8 },   // Fast drop
];

const totalDistance = segments.reduce((sum, s) => sum + s.lengthMiles, 0);
console.log(`Total distance: ${totalDistance.toFixed(2)} miles\n`);

function calculateFloatTime(paddleSpeedMph) {
  let totalTimeHours = 0;
  
  for (const seg of segments) {
    const effectiveSpeed = paddleSpeedMph + seg.waterSpeedMph;
    const segmentTime = seg.lengthMiles / effectiveSpeed;
    totalTimeHours += segmentTime;
  }
  
  return totalTimeHours;
}

function calculateWaterOnlyAvg() {
  let totalTime = 0;
  for (const seg of segments) {
    totalTime += seg.lengthMiles / seg.waterSpeedMph;
  }
  return totalDistance / totalTime;
}

const avgWaterSpeed = calculateWaterOnlyAvg();
console.log(`Average water speed (harmonic): ${avgWaterSpeed.toFixed(3)} mph\n`);

console.log("Paddle Speed | Float Time | Effective Speed | Expected (linear)");
console.log("-------------|------------|-----------------|------------------");

for (let paddle = 0; paddle <= 1.0; paddle += 0.1) {
  const time = calculateFloatTime(paddle);
  const effectiveSpeed = totalDistance / time;
  const expectedLinear = paddle + avgWaterSpeed;
  
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  
  console.log(
    `${paddle.toFixed(1)} mph      | ${hours}h ${minutes.toString().padStart(2, '0')}m      | ${effectiveSpeed.toFixed(3)} mph         | ${expectedLinear.toFixed(3)} mph`
  );
}

// Now show the DIFFERENCE from expected
console.log("\n--- Effective vs Expected Speed Difference ---");
for (let paddle = 0; paddle <= 1.0; paddle += 0.1) {
  const time = calculateFloatTime(paddle);
  const effectiveSpeed = totalDistance / time;
  const expectedLinear = paddle + avgWaterSpeed;
  const diff = effectiveSpeed - expectedLinear;
  
  console.log(`Paddle ${paddle.toFixed(1)} mph: Effective ${effectiveSpeed.toFixed(3)} mph, Expected ${expectedLinear.toFixed(3)} mph, Diff ${diff > 0 ? '+' : ''}${diff.toFixed(3)} mph`);
}
