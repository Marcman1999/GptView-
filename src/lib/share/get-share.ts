import "server-only";
import { cache } from "react";
import { loadShare } from "./load-share";

/** Per-request memoised load, so metadata and the page share one upstream fetch. */
export const getShare = cache((shareId: string) => loadShare(shareId));
