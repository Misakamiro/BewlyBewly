import type { APIMAP } from '../../utils'
import { AHS } from '../../utils'

const API_MOMENT = {
  getTopBarNewMomentsCount: {
    url: 'https://api.bilibili.com/x/web-interface/dynamic/entrance',
    _fetch: {
      method: 'get',
    },
    params: {},
    afterHandle: AHS.J_D,
  },
  getTopBarMoments: {
    url: 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/nav',
    _fetch: {
      method: 'get',
    },
    params: {
      type: 'video',
      update_baseline: '',
      offset: '',
    },
    afterHandle: AHS.J_D,
  },
  getTopBarLiveMoments: {
    url: 'https://api.live.bilibili.com/xlive/web-ucenter/v1/xfetter/FeedList',
    _fetch: {
      method: 'get',
    },
    params: {
      page: 1,
      pagesize: 10,
    },
    afterHandle: AHS.J_D,
  },
  getMoments: {
    url: 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all',
    _fetch: {
      method: 'get',
    },
    // 这里刻意不给 offset / update_baseline 任何"看起来像真值"的默认:
    // 首屏必须带 page,而 "offset=0 且 update_baseline 为空" 这种老式形状会被风控直接
    // 拒绝(HTTP 200 + code 4101133,data 为 undefined)。调用方按需传:
    //   首屏 -> page: 1
    //   翻页 -> offset: <响应返回的字符串>
    // 这两个键保留下来只为类型提示;默认值必须是 undefined,serializeParams 会跳过它,
    // 否则又会被当成真实查询参数发出去。
    params: {
      type: 'all',
      page: undefined as number | undefined,
      offset: undefined as string | undefined,
    },
    afterHandle: AHS.J_D,
  },
} satisfies APIMAP

export default API_MOMENT
