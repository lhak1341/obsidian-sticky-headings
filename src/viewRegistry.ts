import type { EventRef, MarkdownView, TFile } from 'obsidian';
import type { StickyHeaderPair } from './stickyHeader';
import type { Heading } from './types';

export interface ViewEntryInit {
  file: TFile;
  view: MarkdownView;
  headings: Heading[];
  stickyHeaders: StickyHeaderPair;
  editMode: boolean;
  layoutChangeEvent: EventRef;
}

export class ViewEntry {
  file: TFile;
  view: MarkdownView;
  headings: Heading[];
  stickyHeaders: StickyHeaderPair;
  editMode: boolean;
  currentIndex: number;
  private layoutChangeEvent: EventRef;
  private scrollListener: ((e: Event) => void) | null = null;
  private offref: (ref: EventRef) => void;

  constructor(init: ViewEntryInit, offref: (ref: EventRef) => void) {
    this.file = init.file;
    this.view = init.view;
    this.headings = init.headings;
    this.stickyHeaders = init.stickyHeaders;
    this.editMode = init.editMode;
    this.currentIndex = -1;
    this.layoutChangeEvent = init.layoutChangeEvent;
    this.offref = offref;
  }

  reattach(scroller: HTMLElement, onScroll: (e: Event) => void): void {
    this.detachScrollListener();
    this.view.contentEl.addEventListener('scroll', onScroll, true);
    this.scrollListener = onScroll;
  }

  detachScrollListener(): void {
    if (this.scrollListener) {
      this.view.contentEl.removeEventListener('scroll', this.scrollListener, true);
      this.scrollListener = null;
    }
  }

  destroy(): void {
    this.stickyHeaders.forEach(c => c.$destroy());
    this.detachScrollListener();
    this.offref(this.layoutChangeEvent);
  }
}

export class ViewRegistry {
  private map = new Map<string, ViewEntry>();
  private readonly offref: (ref: EventRef) => void;

  constructor(offref: (ref: EventRef) => void) {
    this.offref = offref;
  }

  register(leafId: string, init: ViewEntryInit): ViewEntry {
    const entry = new ViewEntry(init, this.offref);
    this.map.set(leafId, entry);
    return entry;
  }

  unregister(leafId: string): void {
    const entry = this.map.get(leafId);
    if (entry) {
      entry.destroy();
      this.map.delete(leafId);
    }
  }

  get(leafId: string): ViewEntry | undefined {
    return this.map.get(leafId);
  }

  has(leafId: string): boolean {
    return this.map.has(leafId);
  }

  forEach(cb: (entry: ViewEntry, leafId: string) => void): void {
    this.map.forEach(cb);
  }

  entries(): IterableIterator<[string, ViewEntry]> {
    return this.map.entries();
  }

  destroyAll(): void {
    this.map.forEach(entry => entry.destroy());
    this.map.clear();
  }
}
