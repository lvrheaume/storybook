import { global } from '@storybook/global';
import type { Addon_BaseType, Addon_Collection, Addon_WrapperType } from '@storybook/types';
import { Addon_TypesEnum } from '@storybook/types';
import type { ComponentProps } from 'react';
import React from 'react';

import memoizerific from 'memoizerific';

import type { State, StoriesHash } from '@storybook/manager-api';
import { Consumer } from '@storybook/manager-api';

import { Preview, createCanvasTab, filterTabs } from '../components/preview/Preview';
import { defaultWrappers } from '../components/preview/Wrappers';
import { filterToolsSide } from '../components/preview/Toolbar';
import { menuTool } from '../components/preview/tools/menu';
import { remountTool } from '../components/preview/tools/remount';
import { zoomTool } from '../components/preview/tools/zoom';
import type { PreviewProps } from '../components/preview/utils/types';

const defaultTabs = [createCanvasTab()];
const defaultTools = [menuTool, remountTool, zoomTool];

const emptyTabsList: Addon_BaseType[] = [];

type FilterProps = [
  entry: PreviewProps['entry'],
  viewMode: State['viewMode'],
  location: State['location'],
  path: State['path'],
];

// memoization to return the same array every time, unless something relevant changes
const memoizedTabs = memoizerific(1)(
  (
    _,
    tabElements: Addon_Collection<Addon_BaseType>,
    parameters: Record<string, any> | undefined,
    showTabs: boolean
  ) =>
    showTabs
      ? filterTabs([...defaultTabs, ...Object.values(tabElements)], parameters)
      : emptyTabsList
);
const memoizedTools = memoizerific(1)(
  (_, toolElements: Addon_Collection<Addon_BaseType>, filterProps: FilterProps) =>
    filterToolsSide([...defaultTools, ...Object.values(toolElements)], ...filterProps)
);
const memoizedExtra = memoizerific(1)(
  (_, extraElements: Addon_Collection<Addon_BaseType>, filterProps: FilterProps) =>
    filterToolsSide([...defaultTools, ...Object.values(extraElements)], ...filterProps)
);

const memoizedWrapper = memoizerific(1)((_, previewElements: Addon_Collection) => [
  ...defaultWrappers,
  ...Object.values(previewElements),
]);

const { PREVIEW_URL } = global;

export type Item = StoriesHash[keyof StoriesHash];

const splitTitleAddExtraSpace = (input: string) =>
  input.split('/').join(' / ').replace(/\s\s/, ' ');

const getDescription = (item: Item) => {
  if (item?.type === 'story' || item?.type === 'docs') {
    const { title, name } = item;
    return title && name ? splitTitleAddExtraSpace(`${title} - ${name} ⋅ Storybook`) : 'Storybook';
  }

  return item?.name ? `${item.name} ⋅ Storybook` : 'Storybook';
};

const mapper = ({
  api,
  state,
}: Parameters<ComponentProps<typeof Consumer>['filter']>[0]): Omit<
  ComponentProps<typeof Preview>,
  'withLoader' | 'id'
> => {
  const { layout, location, customQueryParams, storyId, refs, viewMode, path, refId } = state;
  const entry = api.getData(storyId, refId);

  console.log('preview container');

  const tabsList = Object.values(api.getElements(Addon_TypesEnum.TAB));
  const wrapperList = Object.values(api.getElements(Addon_TypesEnum.PREVIEW));
  const toolsList = Object.values(api.getElements(Addon_TypesEnum.TOOL));
  const toolsExtraList = Object.values(api.getElements(Addon_TypesEnum.TOOLEXTRA));

  return {
    api,
    entry,
    options: layout,
    description: getDescription(entry),
    viewMode,
    refs,
    storyId,
    baseUrl: PREVIEW_URL || 'iframe.html',
    queryParams: customQueryParams,
    tools: memoizedTools(toolsList.length, api.getElements(Addon_TypesEnum.TOOL), [
      entry,
      viewMode,
      location,
      path,
    ]) as Addon_BaseType[],
    toolsExtra: memoizedExtra(toolsExtraList.length, api.getElements(Addon_TypesEnum.TOOL), [
      entry,
      viewMode,
      location,
      path,
    ]) as Addon_BaseType[],
    tabs: memoizedTabs(
      tabsList.length,
      api.getElements(Addon_TypesEnum.TAB),
      entry ? entry.parameters : undefined,
      layout.showTabs
    ) as Addon_BaseType[],
    wrappers: memoizedWrapper(
      wrapperList.length,
      api.getElements(Addon_TypesEnum.PREVIEW)
    ) as Addon_WrapperType[],
    tabId: api.getQueryParam('tab'),
  };
};

const PreviewConnected = React.memo(function PreviewConnected(props: {
  id: string;
  withLoader: boolean;
}) {
  return (
    <Consumer filter={mapper}>{(fromState) => <Preview {...props} {...fromState} />}</Consumer>
  );
});

export default PreviewConnected;
