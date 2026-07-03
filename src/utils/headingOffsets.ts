import type { HeadingCache, MarkdownView } from 'obsidian';
import type { Heading, ISetting } from '../types';
import { getBoundaryOffset, isEditMode } from './obsidian';

const isHeadingRegex = /^<h[1-6]/i;

interface RendererSection {
  html: string;
  height?: number;
}
interface PreviewRenderer {
  sections?: RendererSection[];
}

function forPreview(headings: HeadingCache[], view: MarkdownView, settings: ISetting): Heading[] {
  const boundaryOffset = getBoundaryOffset(view, settings);
  const { sections } = view.previewMode.renderer as unknown as PreviewRenderer;

  if (!sections) {
    return headings.map<Heading>((heading, index) => ({
      ...heading,
      offset: -boundaryOffset,
      indentLevel: heading.level - 1,
      title: heading.heading,
      index,
    }));
  }

  const offsets: number[] = [];
  let heightSum = 0;
  sections.forEach(({ html, height = 0 }) => {
    if (isHeadingRegex.test(html)) {
      offsets.push(heightSum);
    }
    heightSum += height;
  });

  return headings.map<Heading>((heading, index) => ({
    ...heading,
    offset: (offsets[index] ?? 0) - boundaryOffset,
    indentLevel: heading.level - 1,
    title: heading.heading,
    index,
  }));
}

function forSource(headings: HeadingCache[], view: MarkdownView, settings: ISetting): Heading[] {
  const boundaryOffset = getBoundaryOffset(view, settings);
  const containerOffset = view.editMode.containerEl.querySelector<HTMLElement>('.cm-contentContainer')?.offsetTop || 0;
  return headings.map<Heading>((heading, i) => {
    const { top = 0 } = view.editor.cm.lineBlockAt(heading.position.start.offset);
    return {
      ...heading,
      offset: top + containerOffset - boundaryOffset,
      indentLevel: heading.level - 1,
      title: heading.heading,
      index: i,
    };
  });
}

/**
 * Resolves the DOM Y-position of each heading in the current view.
 * Dispatches to the preview or source adapter based on the active edit mode.
 * Returns a Heading[] with `.offset` populated; `.title` still holds the raw
 * heading text and should be enriched with parseMarkdown by the caller.
 */
export function extractOffsets(headings: HeadingCache[], view: MarkdownView, settings: ISetting): Heading[] {
  return isEditMode(view) ? forSource(headings, view, settings) : forPreview(headings, view, settings);
}
