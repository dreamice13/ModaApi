/*
 * @Author: Dreamice dreamice13@foxmail.com
 * @Date: 2022-02-16 16:27:04
 * @LastEditors: Dreamice dreamice13@foxmail.com
 * @LastEditTime: 2023-11-14 11:30:29
 * @FilePath: \ModaApi\app.js
 * @Description: 
 */
// 导入 express 模块
const express = require('express')
const bodyParser = require('body-parser')
// 创建 express 的服务器实例
const app = express()

const joi = require('@hapi/joi')

// 导入 cors 中间件
const cors = require('cors')
// 将 cors 注册为全局中间件
app.use(cors())

// 配置解析表单数据的中间件，注意：这个中间件，只能解析application/x-www-form-urlencoded格式的表单数据
// app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// 一定要在路由之前，封装res.cc函数
// 响应数据的中间件
app.use(function (req, res, next) {
  // status = 0 为成功； status = 1 为失败； 默认将 status 的值设置为 1，方便处理失败的情况
  res.cc = function (err, status = 1) {
    res.send({
      meta: {
        // 状态
        status,
        // 状态描述，判断 err 是 错误对象 还是 字符串
        message: err instanceof Error ? err.message : err,
      }
    })
  }
  res.aa = (msg, status, data = null) => {
    res.send({
      meta: {
        msg,
        status,
        time: Date.now()
      },
      data: data
    })
  }
  next()
})

// 一定要在注册路由之前，配置解析 Token 的中间件
// 导入配置文件
const config = require('./config')
// 解析 token 的中间件
// const expressJWT = require('express-jwt')
// // 使用 .unless({ path: [/^\/api\//] }) 指定哪些接口不需要进行 Token 的身份认证
// app.use(expressJWT({ secret: config.jwtSecretKey }).unless({ path: [/^\/api\//] }))

// 导入并注册用户路由模块
const userRouter = require('./router/user')
app.use('/api', userRouter)
// 导入并使用用户信息路由模块
const userinfoRouter = require('./router/userinfo')
// 注意：以 /my 开头的接口，都是有权限的接口，需要进行 Token 身份认证
app.use('/api', userinfoRouter)
const menuRouter = require('./router/menu')
app.use('/api', menuRouter)
const websiteRouter = require('./router/website')
app.use('/api', websiteRouter)
const articleRouter = require('./router/article')
app.use('/api', articleRouter)
const englishRouter = require('./router/english')
app.use('/api', englishRouter)
const dictionaryRouter = require('./router/dictionary')
app.use('/api', dictionaryRouter)
const searchRouter = require('./router/search')
app.use('/api', searchRouter)
const tagRouter = require('./router/tag')
app.use('/api', tagRouter)
const sayingRouter = require('./router/saying')
app.use('/api', sayingRouter)
const districtRouter = require('./router/district')
app.use('/api', districtRouter)

// 错误中间件
app.use(function (err, req, res, next) {
  // 数据验证失败
  if (err instanceof joi.ValidationError) return res.cc(err)
  // 捕获身份认证失败的错误
  if (err.name === 'UnauthorizedError') return res.cc('身份认证失败！')
  // 未知错误
  res.cc(err)                                                                                                                                                                                                                                                                                                 
})

// 启动服务器
// 调用 app.listen 方法，指定端口号并启动web服务器
app.listen(3007, function () {
  console.log('api server running at http://127.0.0.1:3007')
})