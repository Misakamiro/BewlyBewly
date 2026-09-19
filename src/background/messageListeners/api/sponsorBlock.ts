import { AHS } from '../../utils'

// BilibiliSponsorBlock 社区数据库(https://bsbsb.top),SponsorBlock 兼容协议。
// videoID 为 BV 号;categories 传入 JSON 数组字面量,由 serializeParams 编码。
// 无分段时服务端返回 404,json() 解析失败会走 rejection,调用方按"无分段"处理。
const API_SPONSOR_BLOCK = {
  getSponsorSegments: {
    url: 'https://bsbsb.top/api/skipSegments',
    _fetch: { method: 'get' },
    params: {
      videoID: '',
      categories: '["sponsor","selfpromo"]',
    },
    afterHandle: AHS.J_D,
  },
}

export default API_SPONSOR_BLOCK
