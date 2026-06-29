import type { App, FuzzyMatch } from 'obsidian';
import { FuzzySuggestModal, sanitizeHTMLToDom, setIcon } from 'obsidian';
import type { Heading } from 'src/types';

export class HeadingSuggester extends FuzzySuggestModal<Heading> {
  headings: Heading[];
  onSelect: (heading: Heading) => Promise<void>;
  currentIndex: number;
  constructor(
    app: App,
    headings: Heading[],
    currentIndex: number | undefined,
    onSelect: (heading: Heading) => Promise<void>
  ) {
    super(app);
    this.headings = headings;
    this.onSelect = onSelect;
    this.currentIndex = currentIndex ?? -1;
  }

  getItems(): Heading[] {
    return this.headings;
  }

  getItemText(item: Heading): string {
    return new DOMParser().parseFromString(item.title, 'text/html').body.textContent ?? '';
  }

  renderSuggestion(item: FuzzyMatch<Heading>, el: HTMLElement): void {
    el.style.paddingLeft = item.item.indentLevel + 'em';
    el.addClass('sticky-headings-suggestion-item');
    el.toggleClass('is-current-heading', item.item.index === this.currentIndex);
    setIcon(el, 'heading-' + item.item.level);
    const textEl = el.createEl('span');
    textEl.appendChild(sanitizeHTMLToDom(item.item.title));
  }

  onChooseItem(item: Heading): void {
    this.onSelect(item);
  }
}
