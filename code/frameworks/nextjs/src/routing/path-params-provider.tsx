import React, { useMemo } from 'react';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { type Params } from 'next/dist/shared/lib/router/utils/route-matcher';
import { PAGE_SEGMENT_KEY } from 'next/dist/shared/lib/segment';
import type { FlightRouterState } from 'next/dist/server/app-render/types';

type PathParamsProviderProps = {
  tree: FlightRouterState;
};

// from Next 14.2.x
// https://github.com/vercel/next.js/pull/60708/files#diff-7b6239af735eba0c401e1a0db1a04dd4575c19a031934f02d128cf3ac813757bR106
function getSelectedParams(currentTree: FlightRouterState, params: Params = {}): Params {
  const parallelRoutes = currentTree[1];

  for (const parallelRoute of Object.values(parallelRoutes)) {
    const segment = parallelRoute[0];
    const isDynamicParameter = Array.isArray(segment);
    const segmentValue = isDynamicParameter ? segment[1] : segment;
    if (!segmentValue || segmentValue.startsWith(PAGE_SEGMENT_KEY)) continue;

    // Ensure catchAll and optional catchall are turned into an array
    const isCatchAll = isDynamicParameter && (segment[2] === 'c' || segment[2] === 'oc');

    if (isCatchAll) {
      params[segment[0]] = segment[1].split('/');
    } else if (isDynamicParameter) {
      params[segment[0]] = segment[1];
    }

    params = getSelectedParams(parallelRoute, params);
  }

  return params;
}

export const PathParamsProvider: React.FC<React.PropsWithChildren<PathParamsProviderProps>> = ({
  tree,
  children,
}) => {
  const pathParams = useMemo(() => {
    return getSelectedParams(tree);
  }, [tree]);

  return <PathParamsContext.Provider value={pathParams}>{children}</PathParamsContext.Provider>;
};
