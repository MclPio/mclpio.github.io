const assert = require('assert');
// We will import the logic class. For now, assuming it's in a file we can require or we'll mock it here to define the interface.
// Since the actual file will be client-side JS, we might need to make it module-friendly or just copy-paste for the test if we don't have a bundler.
// Let's assume we will write the logic in a way that can be tested.

class MinuteRepeaterLogic {
  static calculateChimes(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();

    // Convert to 12-hour format
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    const quarters = Math.floor(minutes / 15);
    const minutesPastQuarter = minutes % 15;

    const sequence = [];

    // Hours
    for (let i = 0; i < hours; i++) {
      sequence.push('hour');
    }

    // Quarters
    for (let i = 0; i < quarters; i++) {
      sequence.push('quarter');
    }

    // Minutes
    for (let i = 0; i < minutesPastQuarter; i++) {
      sequence.push('minute');
    }

    return sequence;
  }
}

// Tests
console.log('Running Minute Repeater Logic Tests...');

// Test 1: 12:00 -> 12 hours, 0 quarters, 0 minutes
let date = new Date('2023-01-01T12:00:00');
let chimes = MinuteRepeaterLogic.calculateChimes(date);
assert.strictEqual(chimes.filter(c => c === 'hour').length, 12, 'Should have 12 hour chimes');
assert.strictEqual(chimes.filter(c => c === 'quarter').length, 0, 'Should have 0 quarter chimes');
assert.strictEqual(chimes.filter(c => c === 'minute').length, 0, 'Should have 0 minute chimes');
console.log('Test 1 Passed: 12:00');

// Test 2: 1:15 -> 1 hour, 1 quarter, 0 minutes
date = new Date('2023-01-01T01:15:00');
chimes = MinuteRepeaterLogic.calculateChimes(date);
assert.strictEqual(chimes.filter(c => c === 'hour').length, 1, 'Should have 1 hour chime');
assert.strictEqual(chimes.filter(c => c === 'quarter').length, 1, 'Should have 1 quarter chime');
assert.strictEqual(chimes.filter(c => c === 'minute').length, 0, 'Should have 0 minute chimes');
console.log('Test 2 Passed: 1:15');

// Test 3: 4:59 -> 4 hours, 3 quarters, 14 minutes
date = new Date('2023-01-01T04:59:00');
chimes = MinuteRepeaterLogic.calculateChimes(date);
assert.strictEqual(chimes.filter(c => c === 'hour').length, 4, 'Should have 4 hour chimes');
assert.strictEqual(chimes.filter(c => c === 'quarter').length, 3, 'Should have 3 quarter chimes');
assert.strictEqual(chimes.filter(c => c === 'minute').length, 14, 'Should have 14 minute chimes');
console.log('Test 3 Passed: 4:59');

// Test 4: 00:00 (Midnight) -> 12 hours
date = new Date('2023-01-01T00:00:00');
chimes = MinuteRepeaterLogic.calculateChimes(date);
assert.strictEqual(chimes.filter(c => c === 'hour').length, 12, 'Should have 12 hour chimes');
console.log('Test 4 Passed: Midnight');

console.log('All tests passed!');
