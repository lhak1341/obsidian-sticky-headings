<script lang="ts">
  import type { MarkdownView, TFile } from 'obsidian';
  import type { Heading } from '../../types';

  let heading = $state<Heading | undefined>(undefined);
  let view = $state<MarkdownView | undefined>(undefined);
  let file = $state<TFile | undefined>(undefined);

  export function update(props: {
    heading?: Heading | undefined;
    view?: MarkdownView | undefined;
    file?: TFile | undefined;
  }) {
    if ('heading' in props) heading = props.heading;
    if ('view' in props) view = props.view;
    if ('file' in props) file = props.file;
  }
</script>

{#if heading && file && view}
  <div class="sticky-headings-status-bar">
    <div class="sticky-headings-status-bar-part">{file.basename}</div>
    <div>/</div>
    <div class="sticky-headings-status-bar-part">{@html heading.title}</div>
  </div>
{/if}

<style>
  .sticky-headings-status-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }
  .sticky-headings-status-bar-part {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sticky-headings-status-bar-part :global(p) {
    margin: 0 !important;
  }
</style>
