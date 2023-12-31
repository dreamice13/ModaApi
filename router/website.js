const express = require('express')
const router = express.Router()

const websiteHandler = require('../router_handler/website')

router.get('/websites', websiteHandler.websiteList)
router.post('/websites', websiteHandler.addWebsite)
router.put('/websites/:id', websiteHandler.updateWebsite)
router.delete('/websites/:id', websiteHandler.deleteWebsite)
router.put('/websitesclick/:id', websiteHandler.clickWebsite)
/* 
  * 网站推荐
*/
router.get('/recommendWebsites', websiteHandler.recommendWebsites)
/**
 * @description: 网站总数
 * @return {*}
 */
router.get('/totalWeb', websiteHandler.totalWeb)
module.exports = router

/**
 * @description: 网站分组
 * @return {*}
 */
router.get('/groupWeb', websiteHandler.groupWeb)
module.exports = router