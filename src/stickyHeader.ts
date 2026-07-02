import StickyHeader from './ui/StickyHeader.svelte';
import type { MarkdownView } from 'obsidian';
import type { Heading, ISetting } from './types';

export type StickyHeaderPair = [StickyHeader, StickyHeader];

export function mountStickyHeaders(view: MarkdownView, settings: ISetting): StickyHeaderPair {
  const sharedProps = {
    headings: [],
    editMode: false,
    view,
    getExpectedHeadings: () => [],
    settings,
    showFileName: false,
    expectedHeadings: [],
  };
  return [
    new StickyHeader({ target: view.previewMode.containerEl, props: sharedProps }),
    new StickyHeader({ target: view.editMode.editorEl, props: sharedProps }),
  ];
}

export function updateHeadings(
  pair: StickyHeaderPair,
  headings: Heading[],
  getExpectedHeadings: (index: number) => Heading[],
  showFileName: boolean,
  view: MarkdownView
): void {
  pair.forEach(c => c.$set({ headings, getExpectedHeadings, showFileName, view }));
}
