import type StickyHeadingsPlugin from './plugin';
import type { App, SettingDefinitionItem } from 'obsidian';
import { PluginSettingTab } from 'obsidian';
import L from './i18n';
import type { ISetting } from './types';

export const defaultSettings = {
  max: 0,
  mode: 'default',
  scrollBehaviour: 'smooth',
  theme: 'flat',
  showIcon: true,
  autoShowFileName: true,
  showInStatusBar: false,
  boundaryOffset: '0px',
} satisfies ISetting;

export default class StickyHeadingsSetting extends PluginSettingTab {
  plugin: StickyHeadingsPlugin;

  constructor(app: App, plugin: StickyHeadingsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    await super.setControlValue(key, value);
    this.plugin.onSettingChanged();
    this.update();
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const notDisabled = (): boolean => this.plugin.settings.mode !== 'disable';

    return [
      {
        name: L.setting.mode.title(),
        desc: L.setting.mode.description(),
        control: {
          type: 'dropdown',
          key: 'mode',
          options: {
            default: L.setting.mode.default(),
            concise: L.setting.mode.concise(),
            disable: L.setting.mode.disable(),
          },
        },
      },
      {
        name: L.setting.max.title(),
        desc: L.setting.max.description(),
        visible: notDisabled,
        render: setting => {
          setting.addText(text => {
            text.setValue(String(this.plugin.settings.max));
            text.onChange(async value => {
              this.plugin.settings.max = parseInt(value, 10) || 0;
              await this.plugin.saveSettings();
              this.plugin.onSettingChanged();
              this.update();
            });
          });
        },
      },
      {
        name: L.setting.scrollBehaviour.title(),
        desc: L.setting.scrollBehaviour.description(),
        control: {
          type: 'dropdown',
          key: 'scrollBehaviour',
          options: {
            smooth: L.setting.scrollBehaviour.smooth(),
            instant: L.setting.scrollBehaviour.instant(),
          },
        },
      },
      {
        name: L.setting.theme.title(),
        visible: notDisabled,
        control: {
          type: 'dropdown',
          key: 'theme',
          options: {
            flat: 'Flat',
            blur: 'Blur',
            float: 'Float',
          },
        },
      },
      {
        name: L.setting.indicators.title(),
        desc: L.setting.indicators.description(),
        visible: notDisabled,
        control: {
          type: 'toggle',
          key: 'showIcon',
        },
      },
      {
        name: L.setting.autoShowFileName.title(),
        desc: L.setting.autoShowFileName.description(),
        visible: notDisabled,
        control: {
          type: 'toggle',
          key: 'autoShowFileName',
        },
      },
      {
        name: L.setting.showInStatusBar(),
        control: {
          type: 'toggle',
          key: 'showInStatusBar',
        },
      },
      {
        name: L.setting.boundaryOffset.title(),
        desc: L.setting.boundaryOffset.description(),
        visible: notDisabled,
        render: setting => {
          setting.addText(text => {
            text.setValue(this.plugin.settings.boundaryOffset);
            text.onChange(async value => {
              if (/^-?\d+(%|px)$/.test(value)) {
                this.plugin.settings.boundaryOffset = value;
                await this.plugin.saveSettings();
                this.plugin.onSettingChanged();
                this.update();
              }
            });
          });
        },
      },
    ];
  }
}
