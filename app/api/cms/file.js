const Router = require('koa-router')

const fileApi = new Router({
    prefix: '/cms/file'
})

fileApi.post('/upload', async (ctx) => {
    const files = await ctx.multipart();
    console.log(files)
    ctx.body = {
        'msg': '成功啦'
    }
})
module.exports = fileApi