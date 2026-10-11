// 由于 sendResponse 复杂, 所以使用自定义的函数
import type { APIMAP } from '../../utils'
import { AHS } from '../../utils'

const API_AUTH = {
  // biliJct 似乎没有使用
  logout: {
    url: 'https://passport.bilibili.com/login/exit/v2',
    _fetch: {
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: {
        biliCSRF: '',
        // biliJct: '',
      },
    },
    params: {
      biliCSRF: '',
    },
    afterHandle: AHS.J_S,
  },
} satisfies APIMAP

export default API_AUTH
