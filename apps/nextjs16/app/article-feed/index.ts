import { ArticleDetailLayer } from './ArticleDetailLayer';
import { ArticleSummaryLayer } from './ArticleSummaryLayer';
import { ShareDialogLayer } from './ShareDialogLayer';

export { ArticleListScreen } from './ArticleListScreen';
export { ArticleDetailLayer } from './ArticleDetailLayer';
export { ArticleSummaryLayer } from './ArticleSummaryLayer';
export { ShareDialogLayer } from './ShareDialogLayer';
export { PortalContainerContext } from './PortalContainerContext';

export const articleFeedRegistry = {
  'article-detail': ArticleDetailLayer,
  'article-summary': ArticleSummaryLayer,
  'share-dialog': ShareDialogLayer,
};
