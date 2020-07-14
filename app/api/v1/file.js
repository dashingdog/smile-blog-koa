const Router = require('koa-router')

const { UpLoader } = require('../../lib/upload')
const { Auth } = require('../../../middleware/auth')

const fileApi = new Router({
  prefix: '/v1/file'
})

fileApi.post('/',
  new Auth().m,
  async (ctx) => {
    console.log('进入上传图片接口')
    const files = await ctx.multipart()
    const upLoader = new UpLoader(`blog/`)
    const arr = await upLoader.upload(files)
    ctx.body = arr
  })

module.exports = fileApi