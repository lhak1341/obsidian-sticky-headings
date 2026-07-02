import type { HeadingCache } from 'obsidian';

export interface ISetting {
  max: number;
  mode: 'default' | 'concise' | 'disable';
  theme: string;
  scrollBehaviour: ScrollBehavior;
  showIcon: boolean;
  autoShowFileName: boolean;
  showInStatusBar: boolean;
  boundaryOffset: string;
}

export interface Heading extends HeadingCache {
  title: string;
  offset: number;
  indentLevel: number;
  index: number;
}

declare module 'obsidian' {
  interface MarkdownSubView {
    type: 'source' | 'preview';
  }
  interface RendererSection {
    height: number;
  }
}
