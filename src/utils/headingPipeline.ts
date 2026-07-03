import type { Heading, ISetting } from '../types';

// Recursively selects the "ancestor" headings that represent the current scroll context.
// For each group sharing the shallowest level, default mode keeps all of them; concise
// mode keeps only the last one. Then recurses on the slice after the last kept heading.
function selectAncestors(subHeadings: Heading[], result: Heading[], mode: ISetting['mode']): void {
  if (!subHeadings.length || mode === 'disable') return;
  const topLevel = subHeadings.reduce((min, h) => Math.min(min, h.level), 6);
  const topLevelIndexes = subHeadings.reduce<number[]>((acc, h, i) => {
    if (h.level === topLevel) acc.push(i);
    return acc;
  }, []);
  if (mode === 'concise') {
    result.push(subHeadings[topLevelIndexes[topLevelIndexes.length - 1]]);
  } else {
    for (const i of topLevelIndexes) {
      result.push(subHeadings[i]);
    }
  }
  selectAncestors(subHeadings.slice(topLevelIndexes[topLevelIndexes.length - 1] + 1), result, mode);
}

// Computes relative indent depths for a filtered heading list. Only increments on a
// child heading — never decrements — so the displayed breadcrumb stays stable when
// headings skip levels.
function calcRelativeIndents(headings: Heading[]): number[] {
  const result: number[] = [];
  if (!headings.length) return result;
  let current = 0;
  headings.forEach((h, i) => {
    if (i !== 0 && h.level > headings[i - 1].level) current++;
    result.push(current);
  });
  return result;
}

/**
 * Pure pipeline: given pre-enriched headings (offsets already resolved from the DOM),
 * the current scroll position, the sticky header's own rendered height, and settings —
 * returns the heading rows to display with their relative indent levels.
 */
export function compute(
  headings: Heading[],
  scrollTop: number,
  stuckHeaderHeight: number,
  settings: ISetting
): Heading[] {
  if (settings.mode === 'disable') return [];
  const inView = headings.filter(h => h.offset < scrollTop + stuckHeaderHeight);
  const selected: Heading[] = [];
  selectAncestors(inView, selected, settings.mode);
  const capped = settings.max ? selected.slice(-settings.max) : selected;
  const indents = calcRelativeIndents(capped);
  return capped.map((h, i) => ({ ...h, indentLevel: indents[i] || 0 }));
}

/**
 * Returns a factory that predicts which headings would be shown after navigating to
 * the heading at `index`. Used to measure the sticky header's post-navigation height
 * before the scroll actually happens.
 */
export function makeExpectedHeadings(
  headings: Heading[],
  max: number,
  mode: ISetting['mode']
): (index: number) => Heading[] {
  return (index: number) => {
    if (mode === 'disable') return [];
    const sub = headings.slice(0, index);
    const result: Heading[] = [];
    selectAncestors(sub, result, mode);
    return max ? result.slice(-max) : result;
  };
}
