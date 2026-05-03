const BreakReminder = require('../src/main/reminder');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('calls onRemind after interval', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(1); // 1 minute
  expect(onRemind).not.toHaveBeenCalled();
  jest.advanceTimersByTime(60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(1);
});

test('calls onRemind repeatedly', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(1);
  jest.advanceTimersByTime(3 * 60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(3);
});

test('stop() prevents further calls', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(1);
  jest.advanceTimersByTime(60 * 1000);
  r.stop();
  jest.advanceTimersByTime(60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(1);
});

test('restart() resets interval with new duration', () => {
  const onRemind = jest.fn();
  const r = new BreakReminder({ onRemind });
  r.start(10);
  r.restart(1);
  jest.advanceTimersByTime(60 * 1000);
  expect(onRemind).toHaveBeenCalledTimes(1);
});
