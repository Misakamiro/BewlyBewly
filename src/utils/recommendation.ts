import type { Item as WebRecommendationItem } from '~/models/video/forYou'

export type UsableWebRecommendationItem = WebRecommendationItem & {
  owner: NonNullable<WebRecommendationItem['owner']>
  stat: NonNullable<WebRecommendationItem['stat']>
}

export function isUsableWebRecommendationItem(item: WebRecommendationItem): item is UsableWebRecommendationItem {
  return item.goto !== 'ad' && Boolean(item.owner) && Boolean(item.stat)
}
