// https://app.quicktype.io/?l=ts

export interface forYouResult {
  code: number
  message: string
  ttl: number
  data: Data
}

export interface Data {
  item: Item[]
  side_bar_column: any[]
  business_card: null
  floor_info: null
  user_feature: null
  preload_expose_pct: number
  preload_floor_expose_pct: number
  mid: number
}

export interface Item {
  id: number
  bvid: string
  cid: number
  goto: Goto
  uri: string
  pic: string
  pic_4_3: string
  title: string
  duration: number
  pubdate: number
  owner: Owner | null
  stat: Stat | null
  av_feature: null | unknown
  is_followed: number
  rcmd_reason: RcmdReason | null
  show_info: number
  track_id: string
  pos: number
  room_info: null | unknown
  ogv_info: null | unknown
  business_info: null | unknown
  is_stock: number
  enable_vt: number
  vt_display: string
}

export enum Goto {
  AV = 'av',
  AD = 'ad',
}

export interface Owner {
  mid: number
  name: string
  face: string
}

export interface RcmdReason {
  reason_type: number
  content?: string
}

export interface Stat {
  view: number
  like: number
  danmaku: number
  vt: number
}
