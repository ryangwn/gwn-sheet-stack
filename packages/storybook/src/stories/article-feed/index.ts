import { ArticleDetailLayer } from './article-detail-layer';
import { ArticleSummaryLayer } from './article-summary-layer';
import { ShareDialogLayer } from './share-dialog-layer';

export { MobileFrame } from './mobile-frame';
export { ArticleListScreen } from './article-list-screen';
export { ArticleDetailLayer } from './article-detail-layer';
export { ArticleSummaryLayer } from './article-summary-layer';
export { ShareDialogLayer } from './share-dialog-layer';
export { PortalContainerContext } from './portal-container-context';

export const articleFeedRegistry = {
  'article-detail': ArticleDetailLayer,
  'article-summary': ArticleSummaryLayer,
  'share-dialog': ShareDialogLayer,
};
