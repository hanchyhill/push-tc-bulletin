const sqlite = require('sqlite3').verbose();
const rp = require('request-promise');
const {getTyExpress,getBJbulet} = require('./getData/getBJbulletin.js');
const MD5 = require('md5');
const {getNoaa} = require('./getData/getBulletin.js');
const moment = require('moment');
const schedule = require('node-schedule');
const axios = require('axios')

const weixinHookURI = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=903afbf2-d0f8-456c-9f9d-e2693398320c';
let db = new sqlite.Database('./db/bulletin.private.db');
const bulletinConfig = [
  { name:'WTPQ2-RJTD', 
    cnName:'日本台风警报',
    ins:'JMA',
    url:'http://www.jma.go.jp/en/typh/',
    img:'http://www.jma.go.jp/en/typh/images/wide/all-00.png',
    timeFormat:'YY年M月D日H时',
  },
  { name:'WTPN3-PGTW', 
    cnName:'JTWC热带气旋生成警报',
    ins:'JTWC',
    url:'http://jtwc.gdmo.gq/jtwc/jtwc.html?tropical',
    img:'http://jtwc.gdmo.gq/jtwc/products/abpwsair.jpg',
    timeFormat:'YY年M月D日H时',
    regTCFA:'TROPICAL CYCLONE FORMATION ALERT',
  },
  { name:'WTPN2-PGTW',
    cnName:'JTWC热带气旋生成警报',
    ins:'JTWC',
    url:'http://jtwc.gdmo.gq/jtwc/jtwc.html?tropical',
    img:'http://jtwc.gdmo.gq/jtwc/products/abpwsair.jpg',
    timeFormat:'YY年M月D日H时',
    regTCFA:'TROPICAL CYCLONE FORMATION ALERT',
  },
  { name:'EXP-BABJ', 
    cnName:'NMC台风快讯',
    ins:'BABJ',
    url:'http://www.nmc.cn/publish/typhoon/typhoon_new.html',
    timeFormat:'YY年M月D日H时m分',
  },
  { name:'BULL-BABJ', 
    cnName:'北京台风报文',
    ins:'BABJ',
    url:'http://www.nmc.cn/publish/typhoon/message.html',
    timeFormat:'YY年M月D日H时m分',
  },// 包含三类报文
  // http://jtwc.gdmo.gq/jtwc/rss/jtwc.rss
];
/**
 * get 从一个或多个表中选择一行数据
 */
db.getAsync = function (sql, param=[]) {
  var that = this;
  return new Promise(function (resolve, reject) {
    that.get(sql, param, function (err, row) {
      if (err)
        reject(err);
      else
        resolve(row);
    });
  });
};

/**
 * 从一个或多个表中选择多行数据，得到Array
 */
db.allAsync = function (sql, param=[]) {
  var that = this;
  return new Promise(function (resolve, reject) {
    that.all(sql, param, function (err, rows) {
      if (err)
        reject(err);
      else
        resolve(rows);
    });
  });
};

/**
 * 执行sql语句, 无返回值
 */
db.runAsync = function (sql, param=[]) {
  var that = this;
  return new Promise(function (resolve, reject) {
    that.run(sql, param, function(err) {
      if (err)
        reject(err);
      else
        resolve();
    });
  })
};

async function insertKey(key, name){
  let insertSql = `INSERT INTO Subscriptions (serverChanKey, name, timestamps) VALUES ('${key}', '${name}', '${(new Date()).toUTCString()}')`;
  console.log(insertSql);
  try{
    await db.runAsync(insertSql);
    return
  }catch(err){
    throw err;
  }
}

/**
 * 更新报文
 * @param {Object} param0 报文JSON
 */
async function updateBulletin({name='EXP-BABJ', content='test', timestamps=''}){
  
  const newMD5 = MD5(content);
  const getSql = `SELECT MD5 FROM Bulletins WHERE name='${name}'`;
  try {
    const row = await db.getAsync(getSql);
    const lastModified = (new Date()).toUTCString();
    if (!row) {// 数据为空
      console.log(`${name} NOT FOUND`);
      let cfg = bulletinConfig.find(v=>v.name === name);
      console.log('INSERT INTO Bulletins');
      let insertSql;
      if(cfg){
        insertSql = `INSERT INTO Bulletins (name, content, MD5, lastModified, timestamps, ins, cnName) VALUES (?, ?, ?, ?, ?, ?, ?);`;
        await db.runAsync(insertSql, [name, content, newMD5, lastModified, timestamps, cfg.ins, cfg.cnName]);
      }else{
        insertSql = `INSERT INTO Bulletins (name, content, MD5, lastModified, timestamps) VALUES (?, ?, ?, ?, ?);`;
        await db.runAsync(insertSql, [name, content, newMD5, lastModified, timestamps]);
      }
      
      return {error:false, message:'插入一条报文'};
    }else{
      const oldMD5 = row['MD5'];
      if(oldMD5 !== newMD5){
        // const updateSql = `UPDATE Bulletins SET MD5='${newMD5}', content='${content}', lastModified='${lastModified}' WHERE name='${name}'`;
        const updateSql = `UPDATE Bulletins SET MD5=?, content=?, lastModified=?, timestamps=? WHERE name=?`;
        console.log('更新报文')
        // await db.runAsync(updateSql);
        await db.runAsync(updateSql, [newMD5, content, lastModified, timestamps, name]);
        return {error:false, message:'报文更新成功'};
      }else{
        return {error:true, message: name+'报文数据重复'};
      }
    }
  } catch (error) {
    throw error;
  }
}

async function getAllKeys(){
  let getSql = `SELECT serverChanKey FROM Subscriptions`;
  try {
    let keyArr = await db.allAsync(getSql);
    return keyArr;
  } catch (error) {
    throw error
  }
}

function createPushOpt(key='', title='日本台风报文', des='![日本台风报文](http://www.jma.go.jp/en/typh/images/wide/all-00.png)'){
  let scUrl = `https://sc.ftqq.com/${key}.send`;
  let option = {
    method: 'POST',
    uri: scUrl,
    form: {
      text: title, // 消息标题，最长为256，必填
      desp: des, // 消息内容，最长64Kb，可空，支持MarkDown
    },
    json: true, // Automatically stringifies the body to JSON
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    }
  };
  return option;
}

convertBulletin2Markdown = (bulletin={timeString:'',content:'',cnName:'',url:'', name:'', timestamps:null})=>{
  let cfg = bulletinConfig.find(v=>v.name === bulletin.name);
  if(!cfg) return TypeError('无法识别的报文类型');

    let dateString = moment(bulletin.timestamps).format(cfg.timeFormat);
    let title = `${cfg.cnName} ${dateString}`;
    let des = `
* 此消息生成时间:${moment().format('YYYY-MM-DD HH:mm:ss')}
* [打开链接查看原文](${cfg.url})
${cfg.img?'!['+cfg.cnName+']('+cfg.img+')':''}
\`\`\`
${bulletin.content.trim()}
\`\`\`
`;
  return {title, des};
}

/**
 * 
 * @param {String} title 
 * @param {String} des 
 */
function createHookOpt( title='日本台风报文', des='![日本台风报文](http://www.jma.go.jp/en/typh/images/wide/all-00.png)', hookURI='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=ebaf8a3f-e4a5-4dd6-adba-050cc2fadfff'){
  let scUrl = hookURI;
  let option = {
    method: 'POST',
    url: scUrl,
    headers: {'content-type': 'application/json'},
    data: {
      "msgtype": "markdown",
      "markdown": {
        "content": `${title}
        
        ${des}`,
    }
    }
  };
  return option;
}

convertBulletin2WeixinCompanyMarkdown = (bulletin={timeString:'',content:'',cnName:'',url:'', name:'', timestamps:null})=>{
  let cfg = bulletinConfig.find(v=>v.name === bulletin.name);
  if(!cfg) return TypeError('无法识别的报文类型');

    let dateString = moment(bulletin.timestamps).format(cfg.timeFormat);
    let title = `${cfg.cnName}`;
    let des = `
> 此消息生成时间:${moment().format('YYYY-MM-DD HH:mm:ss')}
> [打开链接查看原文](${cfg.url})

${bulletin.content.trim()}

`;
  return {title, des};
}

/**
 * 发送到微信主程序
 * @param {Object} bullet 报文
 */
async function push2weixin(bullet){
  
    try{
      let ms = await updateBulletin(bullet);
      console.log(ms.message);
      if(ms.error){// 没更新数据则退出
        return;
      }
      /**server酱部分 */
      let pushContent = convertBulletin2Markdown(bullet);
      console.log(pushContent);
      let keyArr = await getAllKeys();
    
      for(let row of keyArr){
        const key = row.serverChanKey;
        let scOpt = createPushOpt(key, pushContent.title, pushContent.des);// 创建RP请求
        // TODO 限制并发数
        rp(scOpt)
          .then(res=>{
            console.log('server酱返回值:')
            console.log(res);
          })
          .catch(err=>{throw err});
        // let res = await rp(scOpt).catch(err=>{throw err});// TODO, 如何发送错误如何回退?
        
      }
      /**企业微信部分 */
      let pushContent2 = convertBulletin2WeixinCompanyMarkdown(bullet);
      // let weixinHookOpt = createHookOpt(pushContent2.title, pushContent2.des);// 创建测试请求
      let weixinHookOpt = createHookOpt(pushContent2.title, pushContent2.des, weixinHookURI);// 创建请求
      axios(weixinHookOpt)
        .then(function (response) {
          console.log(response.data);
        });
    }catch(err){
      throw err;
    }
  
  // console.log(JSON.stringify(BJEx,null,2));
}

/**
 * 主程序入口
 */
async function initGet(){
  let taskList = [getTyExpress, getBJbulet];
  try{
    for(let task of taskList){
      let bullet = await task();
      if(bullet.error){
        console.log(bullet.message)
        continue;
      }else{
        await push2weixin(bullet);
      }
    }
    let dataList = await getNoaa();
    for(let bullet of dataList){
      await push2weixin(bullet);
    }
  }catch(err){
    throw err;
  }
}


// insertKey('','test');

/**轮询任务 */
async function recurring() {
  let ruleI1 = new schedule.RecurrenceRule();
  ruleI1.minute = [new schedule.Range(0, 59, 1)];// 1分钟轮询
  let job1 = schedule.scheduleJob(ruleI1, (fireDate)=>{
    console.log('轮询开始'+fireDate.toString());
    initGet().catch(err=>{console.trace(err)});
  });
  return job1;
}

console.log('sqlite3...start');
recurring()
  .catch(err=>{
    console.error(err);
  });