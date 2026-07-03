import { mount, unmount } from 'svelte';
import StickyHeaderComponent from './ui/StickyHeader.svelte';
import type { MarkdownView } from 'obsidian';
import type { Heading, ISetting } from './types';

interface StickyHeaderUpdateProps {
  headings?: Heading[];
  editMode?: boolean;
  view?: MarkdownView;
  settings?: ISetting;
  getExpectedHeadings?: (clickHeadingIndex: number) => Heading[];
  showFileName?: boolean;
  expectedHeadings?: Heading[];
}

type MountedStickyHeader = {
  update: (props: StickyHeaderUpdateProps) => void;
} & Record<string, unknown>;

export class StickyHeaderHandle {
  private readonly comp: MountedStickyHeader;

  constructor(target: Element, initial: StickyHeaderUpdateProps) {
    this.comp = mount(StickyHeaderComponent, { target }) as MountedStickyHeader;
    this.comp.update(initial);
  }

  $set(props: StickyHeaderUpdateProps) {
    this.comp.update(props);
  }

  $destroy() {
    unmount(this.comp);
  }
}

export type StickyHeaderPair = [StickyHeaderHandle, StickyHeaderHandle];

export function mountStickyHeaders(view: MarkdownView, settings: ISetting): StickyHeaderPair {
  const sharedProps: StickyHeaderUpdateProps = {
    headings: [],
    editMode: false,
    view,
    getExpectedHeadings: () => [],
    settings,
    showFileName: false,
    expectedHeadings: [],
  };
  return [
    new StickyHeaderHandle(view.previewMode.containerEl, sharedProps),
    new StickyHeaderHandle(view.editMode.editorEl, sharedProps),
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
