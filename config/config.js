module.exports = {
  environment: 'dev',
  database: {
    dbName: 'dashingdog_blog',
    host: '111.230.94.16',
    port: 3306,
    user: 'root',
    password: 'fa123321',
    logging: false,
    timezone: '+08:00'
  },
  paginate: {
    pageDefault: 0,     // 默认页码
    countDefault: 10    // 默认一页的数量
  },
  // JWT
  security: {
    // secretKey 需要比较复杂的字符串
    secretKey: 'secretKey',
    accessExp: 60 * 60,  // 1h
    // accessExp: 20,  // 20s 测试令牌过期
    // refreshExp 设置refresh_token的过期时间，默认一个月
    refreshExp: 60 * 60 * 24 * 30,
  },
  // 文件上传
  file: {
    singleLimit: 1024 * 1024 * 2, // 单个文件大小限制
    totalLimit: 1024 * 1024 * 20, // 多个文件大小限制
    count: 10,                    // 单次最大上传数量
    exclude: []                   // 禁止上传格式
    // include:[]
  },
  // 七牛相关配置
  qiniu: {
    accessKey: 'sbrUpYP80MVTQewC2iqyFffMFcunvDVV9uvjmxk4',
    secretKey: '9hKbO0UwG4jg2x8BSKXixvq-sOVz22QCMbUcZQRi',
    bucket: 'dashingdog-blog',
    siteDomain: 'q7mw4ag8c.bkt.clouddn.com/'
  },
  host: 'http://localhost:3000'
}
