const Router = require('koa-router')

const { success } = require('../../lib/helper')
const { CreateAuthorValidator, UpdateAuthorValidator, LoginValidator, PasswordValidator, SelfPasswordValidator } = require('@validator/author')
const { NotEmptyValidator, PositiveIntegerValidator } = require('@validator/common')
const { Auth, RefreshAuth, generateToken } = require('../../../middleware/auth')
const { getSafeParamId } = require('../../lib/util')
const { Forbidden } = require('@exception')
const { TokenType } = require('../../lib/enums')

const { AuthorDao } = require('@dao/author')
const { ArticleAuthorDao } = require('@dao/articleAuthor')

const AuthorDto = new AuthorDao()
const ArticleAuthorDto = new ArticleAuthorDao()

const authorApi = new Router({
  prefix: '/v1/author'
})

// 创建用户
authorApi.post('/', new Auth().m, async (ctx) => {
  const v = await new CreateAuthorValidator().validateclear(ctx)

  await AuthorDto.createAuthor(v)
  success('创建用户成功')
})

// 更新用户信息
authorApi.put('/info', new Auth().m, async (ctx) => {
  const v = await new UpdateAuthorValidator().validate(ctx)
  const id = getSafeParamId(v)

  await AuthorDto.updateAuthor(v, id)
  success('更新用户成功')
})

// 超级管理员修改作者的密码
authorApi.put('/password', new Auth(32).m, async (ctx) => {
  const v = await new PasswordValidator().validate(ctx)
  const id = getSafeParamId(v)

  await AuthorDto.changePassword(v, id)
  success('修改作者密码成功')
})

// 修改自己的密码
authorApi.put('/password/self', new Auth().m, new Auth().m, async (ctx) => {
  const v = await new SelfPasswordValidator().validate(ctx)
  const id = ctx.currentAuthor.id

  await AuthorDto.changeSelfPassword(v, id)
  success('修改密码成功')
})

// 删除作者，需要最高权限 32 才能删除
authorApi.delete('/', new Auth(32).m, async (ctx) => {
  const v = await new PositiveIntegerValidator().validate(ctx)
  const id = getSafeParamId(v)
  
  const authorId = ctx.currentAuthor.id
  if (id === authorId) {
    throw new Forbidden({
      msg: '不能删除自己'
    })
  }
  await AuthorDto.deleteAuthor(id)
  success('删除作者成功')
})

// 登录
authorApi.post('/login', async (ctx) => {
  const v = await new LoginValidator().validate(ctx)
  const name = v.get('body.name')
  const password = v.get('body.password')

  const author = await AuthorDto.verifyEmailPassword(ctx, name, password)

  const accessToken = generateToken(author.id, author.auth, TokenType.ACCESS, { expiresIn: global.config.security.accessExp })
  const refreshToken = generateToken(author.id, author.auth, TokenType.REFRESH, { expiresIn: global.config.security.refreshExp })
  ctx.body = {
    accessToken,
    refreshToken
  }
})

/**
 * 守卫函数，用户刷新令牌，统一异常
 */
authorApi.get('/refresh', new RefreshAuth().m, async (ctx) => {
  const author = ctx.currentAuthor
  
  const accessToken = generateToken(author.id, author.auth, TokenType.ACCESS, { expiresIn: global.config.security.accessExp })
  const refreshToken = generateToken(author.id, author.auth, TokenType.REFRESH, { expiresIn: global.config.security.refreshExp })

  ctx.body = {
    accessToken,
    refreshToken
  }
})

// 获取除了管理员之外的全部作者
authorApi.get('/authors/admin', new Auth().m, async (ctx) => {
  const authors = await AuthorDto.getAdminAuthors()
  ctx.body = authors
})

// 获取全部作者
authorApi.get('/authors', async (ctx) => {
  const authors = await AuthorDto.getAuthors()
  ctx.body = authors
})

authorApi.get('/articles', async (ctx) => {
  const v = await new PositiveIntegerValidator().validate(ctx, {
    id: 'authorId'
  })
  const id = v.get('query.authorId')
  const articles = await ArticleAuthorDto.getAuthorArticles(id)
  ctx.body = articles
})

authorApi.get('/info', new Auth().m, async (ctx) => {
  ctx.body = ctx.currentAuthor
})

module.exports = authorApi