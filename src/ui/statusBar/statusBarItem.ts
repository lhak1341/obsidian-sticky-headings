import { mount, unmount } from 'svelte';
import StatusBarItem from './StatusBarItem.svelte';
import type { MarkdownView, TFile } from 'obsidian';
import type { Heading } from '../../types';

type StatusBarExports = {
  update: (props: { heading?: Heading | undefined; view?: MarkdownView | undefined; file?: TFile | undefined }) => void;
} & Record<string, unknown>;

export default class StatusBarItemComponent {
  private readonly comp: StatusBarExports;

  constructor(statusItemEl: HTMLElement, _settings: unknown, view?: MarkdownView) {
    this.comp = mount(StatusBarItem, { target: statusItemEl }) as StatusBarExports;
    this.comp.update({ view, heading: undefined, file: undefined });
  }

  destroy() {
    unmount(this.comp);
  }

  switchFile(file: TFile, heading: Heading, view: MarkdownView) {
    this.comp.update({ file, heading, view });
  }

  updateHeading(heading?: Heading) {
    this.comp.update({ heading });
  }

  hide() {
    this.comp.update({ file: undefined });
  }
}
