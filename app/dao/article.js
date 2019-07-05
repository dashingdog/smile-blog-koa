const { sequelize } = require('../../core/db')
const { omitBy, isUndefined, intersection } = require('lodash')
const { Op } = require('sequelize')

const { NotFound, Forbidden } = require('@exception')

const { Article } = require('@models/article')
const { ArticleTagDao } = require('@dao/articleTag')
const { ArticleAuthorDao } = require('@dao/articleAuthor')
const { CategoryDao } = require('@dao/category')

const ArticleTagDto = new ArticleTagDao()
const ArticleAuthorDto = new ArticleAuthorDao()
const CategoryDto = new CategoryDao()

class ArticleDao {
  async createArticle(v) {
    const article = await Article.findOne({
      where: {
        title: v.get('body.title')
      }
    })
    if (article) {
      throw new Forbidden({
        msg: '存在同名文章'
      })
    }
    const categoryId = v.get('body.categoryId')
    const category = await CategoryDto.getCategory(categoryId)
    if (!category) {
      throw new Forbidden({
        msg: '未能找到相关分类'
      })
    }
    return sequelize.transaction(async t => {
      const result =  await Article.create({
        title: v.get('body.title'),
        content: v.get('body.content'),
        cover: v.get('body.cover'),
        created_date: v.get('body.createdDate'),
        category_id: categoryId,
        public: v.get('body.public'),
        status: v.get('body.status'),
        like: 0
      }, { transaction: t })
      const articleId = result.getDataValue('id')
      await ArticleTagDto.createArticleTag(articleId, v.get('body.tags'), { transaction: t })
      await ArticleAuthorDto.createArticleAuthor(articleId, v.get('body.authors'), { transaction: t })
    })
  }

  // 编辑某篇文章
  async updateArticle(v) {
    const id = v.get('body.id')
    const article = await Article.findByPk(id)
    if (!article) {
      throw new NotFound({
        msg: '没有找到相关文章'
      })
    }
    const tags = v.get('body.tags')
    const authors = v.get('body.authors')

    // step1: 先删除相关关联
    const isDeleteAuthor = await ArticleAuthorDto.deleteArticleAuthor(id, authors)
    const isDeleteTag = await ArticleTagDto.deleteArticleTag(id, tags)

    // step2: 再创建关联
    if (isDeleteAuthor) {
      await ArticleAuthorDto.createArticleAuthor(id, authors)
    }
    if (isDeleteTag) {
      await ArticleTagDto.createArticleTag(id, tags)
    }

    // step3: 更新文章
    article.title = v.get('body.title')
    article.content = v.get('body.content')
    article.cover = v.get('body.cover')
    article.created_date = v.get('body.createdDate')
    article.category_id = v.get('body.categoryId')
    article.public = v.get('body.public')
    article.status = v.get('body.status')
    article.save()
  }

  // 获取某篇文章详情
  async getArticle(id) {
    const article = await Article.findByPk(id)
    if (!article) {
      throw new NotFound({
        msg: '没有找到相关文章'
      })
    }
    const tags = await ArticleTagDto.getArticleTag(id)
    const authors = await ArticleAuthorDto.getArticleAuthor(id, {
      attributes: { exclude: ['auth', 'description', 'email'] }
    })
    const category = await CategoryDto.getCategory(article.getDataValue('category_id'))
    article.setDataValue('category', category)

    await article.increment('views', { by: 1 })

    return { article, tags, authors }
  }

  async likeArticle(id) {
    const article = await Article.findByPk(id)
    if (!article) {
      throw new NotFound({
        msg: '没有找到相关文章'
      })
    }
    await article.increment('like', { by: 1 })
  }

  // 把文章设为私密或公开
  async updateArticlePublic(id, publicId) {
    const article = await Article.findByPk(id)
    if (!article) {
      throw new NotFound({
        msg: '没有找到相关文章'
      })
    }
    article.public = publicId
    article.save()
  }

  // 获取所有文章
  async getArticles(v) {
    const categoryId = v.get('query.categoryId')
    const authorId = v.get('query.authorId')
    const tagId = v.get('query.tagId')
    const publicId = v.get('query.publicId')
    const statusId = v.get('query.statusId')
    const search = v.get('query.search')

    let ids = []
    if (authorId !== 0 || tagId !== 0) {
      // 求交集
      if (authorId !== 0 && tagId !== 0) {
        const arr1 = await ArticleAuthorDto.getArticleIds(authorId)
        const arr2 = await ArticleTagDto.getArticleIds(tagId)
        ids = intersection(arr1, arr2)
      }
  
      // 查询该标签下是否有文章
      if (tagId !== 0 && authorId === 0) {
        ids = await ArticleTagDto.getArticleIds(tagId)
      }
  
      // 查询该作者下是否有文章
      if (authorId !== 0 && tagId === 0) {
        ids = await ArticleAuthorDto.getArticleIds(authorId)
      }
  
      // 如果作者和标签都没有查询到文章
      if (!ids.length) {
        return []
      }
    }
  
    let query = {
      category_id: categoryId === 0 ? undefined : categoryId,
      status: statusId === 0 ? undefined : statusId,
      public: publicId === 0 ? undefined : publicId
    }

    // 忽略值为空的key
    let target = omitBy(query, isUndefined)
    let opIn = ids.length ? {
      id: {
        [Op.in]: ids
      }
    } : {}
    let like = search ? {
      [Op.or]: [
        {
          title: {
            [Op.like]: `${search}%`,
          }
        },
        {
          content: {
            [Op.like]: `${search}%`,
          }
        }
      ]
    } : {}

    // 构建查询
    const where = {
      ...target,
      ...opIn,
      ...like
    }

    const articles = await Article.findAll({
      where,
      attributes: {
        exclude: ['content']
      }
    })
    for (let i = 0; i < articles.length; i++) {
      await articles[i].setDataValue('tags', await ArticleTagDto.getArticleTag(articles[i].id))
      await articles[i].setDataValue('authors', await ArticleAuthorDto.getArticleAuthor(articles[i].id, {
        attributes: { exclude: ['auth', 'description', 'email', 'avatar'] }
      }))
      await articles[i].setDataValue('category',  await CategoryDto.getCategory(articles[i].category_id, {
        attributes: { exclude: ['description', 'cover']}
      }))
    }
    return articles
  }

  async deleteArticle(id) {
    const article = await Article.findOne({
      where: {
        id
      }
    })
    if (!article) {
      throw new NotFound({
        msg: '没有找到相关文章'
      })
    }

    // 删除相关关联
    await ArticleAuthorDto.deleteArticleAuthor(id)
    await ArticleTagDto.deleteArticleTag(id)
    article.destroy()
  }

  // 获取谋篇文章内容
  async getContent(id) {
    const content = await Article.findOne({
      where: {
        id
      },
      attributes: ['content']
    })
    return content
  }
}

module.exports = {
  ArticleDao
}
