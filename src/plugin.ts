/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import type { TFile } from 'obsidian';
import { MarkdownView, Plugin } from 'obsidian';
import type { ISetting } from './types';
import { ViewRegistry } from './viewRegistry';
import type { ViewEntry } from './viewRegistry';
import StickyHeadingsSetting, { defaultSettings } from './settings';
import {
  getContainerEl,
  getHeadings,
  getScroller,
  isEditMode,
  isEditSourceMode,
  isMarkdownFile,
  needShowFileName,
  parseMarkdown,
} from './utils/obsidian';

import { mountStickyHeaders, updateHeadings as updateStickyHeadings } from './stickyHeader';
import StatusBarItemComponent from './ui/statusBar/statusBarItem';
import { extractOffsets } from './utils/headingOffsets';
import { throttle } from 'lodash';
import { compute, makeExpectedHeadings } from './utils/headingPipeline';
import { HeadingSuggester } from './ui/statusBar/suggester';
import { animateScroll } from './utils/scroll';

export default class StickyHeadingsPlugin extends Plugin {
  settings: ISetting = defaultSettings;
  statusBarItemEl: StatusBarItemComponent | undefined;
  registry!: ViewRegistry;
  statusBarEl: HTMLElement | undefined;
  markdownCache: Record<string, string> = {};

  detectPosition = throttle(
    (event: Event, scroller: HTMLElement, entry: ViewEntry) => {
      const target = event.target as HTMLElement | null;
      if (scroller) {
        const container = target?.closest('.view-content');
        if (container) {
          this.setHeadingsInView(scroller, entry);
        }
      }
    },
    50,
    { leading: true, trailing: true }
  );

  async onload() {
    await this.loadSettings();
    this.registry = new ViewRegistry(ref => this.app.workspace.offref(ref));

    this.initStatusBarItem();

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        // timeout to wait for cm.editor to load
        window.setTimeout(() => {
          this.checkFileResolveMap();
        }, 100);
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('resolve', file => {
        this.handleResolve(file);
      })
    );

    this.checkFileResolveMap();

    this.addSettingTab(new StickyHeadingsSetting(this.app, this));
  }

  initStatusBarItem() {
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass('mod-clickable');
    if (!this.settings.showInStatusBar) {
      this.statusBarEl.addClass('is-hidden');
    }
    this.statusBarEl.addEventListener('click', this.showSuggester.bind(this));
    this.statusBarItemEl = new StatusBarItemComponent(this.statusBarEl, this.settings);
    this.addCommand({
      id: 'quick navigate headings',
      name: 'Quick navigate headings',
      checkCallback: checking => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
          if (!checking) {
            this.showSuggester();
          }
          return true;
        }
        return false;
      },
    });
  }

  showSuggester() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      const { id } = view.leaf;
      const item = this.registry.get(id || '');
      if (item) {
        const { headings, currentIndex } = item;
        const modal = new HeadingSuggester(view.app, headings, currentIndex, async ({ offset, index }) => {
          const height = await this.predictHeadingsHeight(index);
          const scroller = getScroller(view);
          if (this.settings.scrollBehaviour === 'instant') {
            scroller.scrollTo({ top: offset - height - 4, behavior: 'instant' });
          } else {
            animateScroll(scroller, offset - height - 4, 1000);
          }
        });
        modal.open();
      }
    }
  }

  async predictHeadingsHeight(index: number) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      const { id } = view.leaf;
      if (id) {
        const item = this.registry.get(id);
        if (item) {
          const target = (isEditMode(view) ? view.editMode.editorEl : view.previewMode.containerEl).find(
            '.sticky-headings-shadow'
          );
          return new Promise<number>(resolve => {
            const observer = new MutationObserver(records => {
              for (const record of records) {
                if ((record.target as HTMLElement).classList?.contains('sticky-headings-shadow-item')) {
                  observer.disconnect();
                  resolve(target.clientHeight || 0);
                }
              }
            });
            observer.observe(target, {
              subtree: true,
              childList: true,
            });
            item.stickyHeaders.forEach(c =>
              c.$set({
                expectedHeadings: makeExpectedHeadings(item.headings, this.settings.max, this.settings.mode)(index),
              })
            );
          });
        }
      }
    }
    return 0;
  }

  async initStickyHeaderComponent(view: MarkdownView) {
    const { id } = view.leaf;
    if (id) {
      const file = view.getFile();
      if (file && isMarkdownFile(file)) {
        const headings = await this.retrieveHeadings(file, view);
        if (!this.registry.has(id)) {
          const stickyHeaders = mountStickyHeaders(view, this.settings);
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          const layoutChangeEvent = this.app.workspace.on('layout-change', this.handleComponentUpdate.bind(this, view));
          this.registry.register(id, file, view, headings, stickyHeaders, isEditSourceMode(view), layoutChangeEvent);
        } else {
          const entry = this.registry.get(id);
          if (entry) {
            entry.editMode = isEditSourceMode(view);
            entry.headings = headings;
            entry.file = file;
          }
        }
        await this.handleComponentUpdate(view);
      }
    }
  }

  async updateHeadings(file: TFile, view: MarkdownView, entry: ViewEntry) {
    await this.setHeadingsInView(getScroller(view), entry);
    return entry.headings;
  }

  async handleComponentUpdate(view: MarkdownView) {
    const scroller = getScroller(view);
    const { id } = view.leaf;
    if (id) {
      const entry = this.registry.get(id);
      if (entry) {
        entry.editMode = isEditSourceMode(entry.view);
        entry.stickyHeaders.forEach(c => c.$set({ editMode: entry.editMode }));

        if (scroller) {
          await this.setHeadingsInView(scroller, entry);
          entry.reattach(scroller, (event: Event) => this.detectPosition(event, scroller, entry));
        } else {
          entry.detachScrollListener();
        }
        this.updateHeadings(entry.file, entry.view, entry);
      }
    }
  }

  async setHeadingsInView(scroller: HTMLElement, entry: ViewEntry) {
    const { scrollTop } = scroller;
    const stuckHeaderHeight = getContainerEl(scroller)?.clientHeight || 0;
    if (entry) {
      const headings = await this.retrieveHeadings(entry.file, entry.view);
      entry.headings = headings;
      const displayed = compute(headings, scrollTop, stuckHeaderHeight, this.settings);
      entry.currentIndex = displayed.length ? displayed[displayed.length - 1].index : -1;
      updateStickyHeadings(
        entry.stickyHeaders,
        displayed,
        makeExpectedHeadings(headings, this.settings.max, this.settings.mode),
        this.settings.autoShowFileName && needShowFileName(entry.file, this.app),
        entry.view
      );
      this.statusBarItemEl?.switchFile(entry.file, displayed[displayed.length - 1], entry.view);
    } else {
      this.statusBarItemEl?.hide();
    }
  }

  async handleResolve(file: TFile) {
    if (isMarkdownFile(file)) {
      for (const [, entry] of this.registry.entries()) {
        if (entry.file.path === file.path) {
          await this.updateHeadings(file, entry.view, entry);
        }
      }
    }
  }

  checkFileResolveMap() {
    const validIds = new Set<string>();
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof MarkdownView) {
        const { id } = leaf;
        if (id) {
          validIds.add(id);
          this.initStickyHeaderComponent(leaf.view);
        }
      }
    });

    this.registry.forEach((_, id) => {
      if (!validIds.has(id)) {
        this.registry.unregister(id);
      }
    });
  }

  async retrieveHeadings(file: TFile, view: MarkdownView): Promise<Heading[]> {
    const rawHeadings = getHeadings(file, this.app);
    if (!rawHeadings || rawHeadings.length === 0) return [];

    // Step 1: resolve each heading's Y-position from the DOM
    const positioned = extractOffsets(rawHeadings, view, this.settings);

    // Step 2: enrich with parsed markdown titles (async, results cached)
    return Promise.all(
      positioned.map(async heading => {
        const cacheKey = heading.heading;
        if (cacheKey in this.markdownCache) {
          return { ...heading, title: this.markdownCache[cacheKey] };
        }
        const title = await parseMarkdown(heading.heading, this.app);
        this.markdownCache[cacheKey] = title;
        return { ...heading, title };
      })
    );
  }

  onSettingChanged() {
    this.registry.forEach(entry => {
      entry.stickyHeaders.forEach(c => c.$set({ settings: this.settings }));
    });
    if (this.statusBarEl) {
      this.statusBarEl.toggleClass('is-hidden', !this.settings.showInStatusBar);
    }
  }

  onunload() {
    this.registry.destroyAll();
  }

  async loadSettings() {
    this.settings = {
      ...defaultSettings,
      ...((await this.loadData()) as ISetting),
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
