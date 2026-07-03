import { test, expect } from 'bun:test';
import { compute, makeExpectedHeadings } from './headingPipeline';
import type { Heading, ISetting } from '../types';

function settings(overrides: Partial<ISetting> = {}): ISetting {
  return {
    max: 0,
    mode: 'default',
    scrollBehaviour: 'smooth',
    theme: 'flat',
    showIcon: true,
    autoShowFileName: true,
    showInStatusBar: false,
    boundaryOffset: '0px',
    ...overrides,
  };
}

function h(level: number, offset: number, index: number): Heading {
  return {
    level,
    offset,
    indentLevel: level - 1,
    heading: `H${level}`,
    title: `H${level}`,
    index,
    position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } },
  } as unknown as Heading;
}

// compute — basic cases

test('compute returns [] when mode is disable', () => {
  const headings = [h(1, 0, 0), h(2, 100, 1)];
  expect(compute(headings, 200, 0, settings({ mode: 'disable' }))).toEqual([]);
});

test('compute returns [] when no headings are above the scroll position', () => {
  const headings = [h(1, 500, 0), h(2, 800, 1)];
  expect(compute(headings, 0, 0, settings())).toEqual([]);
});

test('compute includes headings whose offset is within scrollTop + stuckHeaderHeight', () => {
  const headings = [h(1, 0, 0), h(2, 100, 1), h(3, 300, 2)];
  // scrollTop=200, stuckHeaderHeight=0 → only offsets < 200 qualify
  const result = compute(headings, 200, 0, settings());
  expect(result).toHaveLength(2);
  expect(result[0].level).toBe(1);
  expect(result[1].level).toBe(2);
});

test('compute assigns relative indent levels (only increments, never decrements)', () => {
  const headings = [h(1, 0, 0), h(2, 50, 1), h(3, 100, 2)];
  const result = compute(headings, 200, 0, settings());
  expect(result.map(r => r.indentLevel)).toEqual([0, 1, 2]);
});

test('compute gives the same indent level to consecutive headings at the same depth', () => {
  // selectAncestors outputs [H1, H1, H2] — two H1s don't bump the indent counter
  const headings = [h(1, 0, 0), h(1, 50, 1), h(2, 100, 2)];
  const result = compute(headings, 200, 0, settings());
  expect(result.map(r => r.indentLevel)).toEqual([0, 0, 1]);
});

test('compute respects max by keeping the last N headings', () => {
  const headings = [h(1, 0, 0), h(2, 50, 1), h(3, 100, 2)];
  const result = compute(headings, 200, 0, settings({ max: 1 }));
  expect(result).toHaveLength(1);
  expect(result[0].level).toBe(3);
});

test('compute concise mode keeps only the last top-level heading per group', () => {
  // Two H1s in view → concise should show only the last one
  const headings = [h(1, 0, 0), h(1, 50, 1), h(2, 100, 2)];
  const result = compute(headings, 200, 0, settings({ mode: 'concise' }));
  expect(result[0].index).toBe(1); // second H1
});

// makeExpectedHeadings

test('makeExpectedHeadings returns [] for disable mode', () => {
  const headings = [h(1, 0, 0), h(2, 100, 1)];
  const factory = makeExpectedHeadings(headings, 0, 'disable');
  expect(factory(2)).toEqual([]);
});

test('makeExpectedHeadings slices headings up to (not including) the given index', () => {
  const headings = [h(1, 0, 0), h(2, 100, 1), h(3, 200, 2)];
  const factory = makeExpectedHeadings(headings, 0, 'default');
  // index=2 → slice(0,2) = [H1, H2]
  const result = factory(2);
  expect(result).toHaveLength(2);
  expect(result[0].level).toBe(1);
  expect(result[1].level).toBe(2);
});

test('makeExpectedHeadings respects max', () => {
  const headings = [h(1, 0, 0), h(2, 100, 1), h(3, 200, 2)];
  const factory = makeExpectedHeadings(headings, 1, 'default');
  const result = factory(3);
  expect(result).toHaveLength(1);
});
