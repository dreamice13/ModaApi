/*
 * @Author: Dreamice dreamice13@foxmail.com
 * @Date: 2022-02-18 20:50:25
 * @LastEditors: Dreamice dreamice13@foxmail.com
 * @LastEditTime: 2023-11-16 01:36:41
 * @FilePath: \ModaApi\router_handler\website.js
 * @Description: 
 */
const db = require('../db/index')

exports.websiteList = (req, res) => {
    const pageNum = parseInt(req.query.pagenum)
    const pageSize = parseInt(req.query.pagesize)
    const serachWord = '%' + req.query.query + '%'
    // 获取标签并生成对应sql
    const tags = req.query.tags
    let tagSql = "";
    if(tags && tags.length > 0){
        let count = tags.length;
        let tagStr = "";
        for(tag of tags){
            tagStr = tagStr + tag + ","
        }
        tagStr = tagStr.substring(0, tagStr.length - 1)
        tagSql = `AND w.id IN (SELECT webid FROM rel_web_tag WHERE tagid IN (${tagStr}) GROUP BY webid HAVING COUNT(webid) = ${count})`
    }
    // sql:获取总数
    const sql_total = `select w.id from website w
            LEFT JOIN (SELECT rwt.webid, GROUP_CONCAT(st.name) tags_name, GROUP_CONCAT(st.id) tags_id FROM rel_web_tag rwt 
            LEFT JOIN sys_tag st ON rwt.tagid = st.id
            GROUP BY rwt.webid) tags ON w.id = tags.webid
            where name like ?  ${tagSql}`
    // sql:查询数据
    const sql_select = `SELECT w.id, w.name, w.url, w.favicon, tags.tags_name, tags.tags_id, w.create_time,
        w.update_time, w.description, lc.num_click
    FROM website w
    LEFT JOIN (SELECT rwt.webid, GROUP_CONCAT(st.name) tags_name, GROUP_CONCAT(st.id) tags_id FROM rel_web_tag rwt 
            LEFT JOIN sys_tag st ON rwt.tagid = st.id
            GROUP BY rwt.webid) tags ON w.id = tags.webid
    LEFT JOIN log_click lc ON w.id = lc.website_id
    where w.name like ?
    ${tagSql}
    order by lc.num_click desc
    limit ${(pageNum - 1)  * pageSize}, ${pageSize} `
    db.query(sql_total, serachWord, (err, results) => {
        const total = results.length
        db.query(sql_select, serachWord, (err, results1) => {
            const data = {
                total: total,
                pagenum: pageNum,
                websites: results1
            }
            res.aa("获取网站列表成功", 200, data)
        })
    })
} 

exports.addWebsite = (req, res) => {
    const websiteInfo = req.body;
    const tags = websiteInfo.tags.split(",");
    const time = Math.round(new Date().getTime()/1000).toString();
    delete websiteInfo.tags;
    const sql = `insert into website set ?`
    const sqlSelect = `select count(1) count from website where url = ? or name = ?`
    const sqlInsertRel = `insert into rel_web_tag set ?`
    websiteInfo.create_time = time
    db.query(sqlSelect, [req.body.url, req.body.name], (err, results) => {
        if(err){
            return res.aa('插入查询website报错', 500)
        } else if(results[0].count == 0){
            db.query(sql, websiteInfo, (err, results) => {
                if(err || results.affectedRows !== 1) return res.aa('添加website报错', 500)
                let webId = results.insertId;
                for(tag of tags){
                    let rel = {};
                    rel.webid = webId;
                    rel.tagid = parseInt(tag);
                    rel.create_time = time;
                    rel.update_time = time;
                    db.query(sqlInsertRel, rel, (err, results) => {
                        if(err || results.affectedRows !== 1) return res.aa('添加website标签报错', 500)
                    })
                }
                return res.aa('添加网站成功', 201)
            })
        }  else  {
            return res.aa('该网站已存在，不需要重复添加', 422)
        }
    })    
}
/* 
  * 更新网站
*/
exports.updateWebsite = (req, res) => {
    // 获取参数, 构建对象
    const id = req.body.id;
    const name = req.body.name;
    const url = req.body.url;
    const tags = req.body.tags;
    const description = req.body.description;
    const favicon = req.body.favicon;
    const update_time =  Math.round(new Date().getTime()/1000).toString();
    const webObj = {name, url, update_time, description, favicon}
    // sql
    const sqlUpdateWeb = `update website set ? where id = ?`
    const sqlDelTag = `delete from rel_web_tag where id = ?`
    const sqlInsertRel = `insert into rel_web_tag set ?`
    const sqlSelectRel = `select * from rel_web_tag where webid = ?`
    db.query(sqlUpdateWeb, [webObj, id], async (err, results) => {
        if(err || results.affectedRows !== 1) return res.aa('修改website报错', 500)
        db.query(sqlSelectRel, id, async (err, results) => {
            let oldTagArr = []
            for(const oldTag of results){
                // 如果旧标签不在新标签内，删除；在则不变
                if(!tags.includes(oldTag.tagid)){
                    db.query(sqlDelTag, oldTag.id, async (err, results) => {
                        if(err) return res.aa('删除website标签报错', 500)
                    })
                }
                oldTagArr.push(oldTag.tagid)
            }
            // 如果新标签不在旧标签内，添加；在则不变
            for(const newTag of tags){
                if(!oldTagArr.includes(newTag)){
                    let relWebTag = {};
                    relWebTag.webid = id;
                    relWebTag.tagid = newTag;
                    relWebTag.create_time = update_time;
                    relWebTag.update_time = update_time;
                    db.query(sqlInsertRel, relWebTag, (err, results) => {
                        if(err || results.affectedRows !== 1) return res.aa('添加website标签报错', 500)
                    })
                }
            }
            return res.aa('修改网站成功！', 200)
        })
    })
}

exports.deleteWebsite = (req, res) => {
    const id = req.params.id
    const sql = `delete from website where id = ?`
    db.query(sql, id, (err, results) => {
        if(err || results.affectedRows !== 1) return res.aa('删除website报错', 500)
        return res.aa('删除网站成功！', 200)
    })
}

exports.clickWebsite = (req, res) => {
    const id = req.params.id;
    const sql_select = `select num_click from log_click where website_id = ?`
    const sql_insert = `insert into log_click (user_id, website_id, num_click) values (1000, ?, 1)`
    const sql_update = `update log_click set num_click = ? where website_id = ?`
    db.query(sql_select, id, (err, results) => {
        if(err) return res.aa('网址访问埋点记录查询报错', 500)
        if(results.length == 0){
            db.query(sql_insert, id, (err, results) => {
                if(err || results.affectedRows !== 1) return res.aa('网址访问埋点记录新增报错', 500)
                return res.aa('网址访问埋点记录成功！', 200)
            })
        } else {
            let num_click = results[0].num_click + 1;
            db.query(sql_update, [num_click, id], (err, results) => {
                if(err || results.affectedRows !== 1) return res.aa('网址访问埋点记录更新报错', 500)
                return res.aa('网址访问埋点记录成功！', 200)
            })
        } 
    })  
}

/* 
  * 网站推荐
*/
exports.recommendWebsites = (req, res) => {
    let num = parseInt(req.query.num)
    num = num - 12
    const subSql = " SELECT w.*, lc.num_click, tags.tags_name FROM website w LEFT JOIN log_click lc ON w.id = lc.website_id LEFT JOIN (SELECT rwt.webid, GROUP_CONCAT(st.name) tags_name, GROUP_CONCAT(st.id) tags_id FROM rel_web_tag rwt LEFT JOIN sys_tag st ON rwt.tagid = st.id GROUP BY rwt.webid) tags ON w.id = tags.webid "
    const sql = 
        "SELECT myTable.* FROM ("
        + " ( " + subSql + " ORDER BY lc.num_click DESC LIMIT 4)"
        + " UNION (" + subSql + " ORDER BY lc.num_click ASC LIMIT 4)"
        + " UNION (" + subSql + " ORDER BY w.create_time DESC LIMIT 4)"
        + " UNION (" + subSql + " WHERE w.id >= (RAND()*(SELECT MAX(id) FROM website)) LIMIT ?)"
        + " ) AS myTable "
        + " ORDER BY RAND()"
        // + " LIMIT ?"
    console.log(sql)
    
    db.query(sql, num, (err, results) => {
        const total = results.length
        const data = {
            total: total,
            num: num,
            websites: results
        }
        res.aa("获取推荐网站成功", 200, data)
    })
}
/**
 * @description: 网站总数
 * @param {*} req
 * @param {*} res
 * @return {*}
 */
exports.totalWeb = (req, res) => {
    const sql = `select count(id) total from website s`
    db.query(sql, (err, results) => {
        const data = {
            total: results[0].total
        }
        res.aa("获取网站总数成功", 200, data)
    })
}

/**
 * @description: 网站总数
 * @param {*} req
 * @param {*} res
 * @return {*}
 */
exports.groupWeb = (req, res) => {
    const sql = `select st.name, a.total value from 
        (select tagid, count(id) total
        from rel_web_tag rwt
        group by rwt.tagid) a
        left  join sys_tag st
        on a.tagid = st.id`
    db.query(sql, (err, results) => {
        const data = {
            group: results
        }
        res.aa("获取网站分组成功", 200, data)
    })
}