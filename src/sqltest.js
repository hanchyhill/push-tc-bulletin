const sqlite = require('sqlite3').verbose();
let db = new sqlite.Database('./db/test.db');
const rp = require('request-promise');
const {getTyExpress,getBJbulet} = require('./getBJbulletin.js');

/**
 * get 从一个或多个表中选择一行数据
 */
db.getAsync = function (sql) {
    var that = this;
    return new Promise(function (resolve, reject) {
        that.get(sql, function (err, row) {
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
db.allAsync = function (sql) {
    var that = this;
    return new Promise(function (resolve, reject) {
        that.all(sql, function (err, rows) {
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

/* this.dao.run(
      `UPDATE projects SET name = ? WHERE id = ?`,
      [name, id]
    )
    return this.dao.run(
      `INSERT INTO tasks (name, description, isComplete, projectId)
        VALUES (?, ?, ?, ?)`,
      [name, description, isComplete, projectId])
      return this.dao.run(
      `DELETE FROM projects WHERE id = ?`,
      [id]
      INSERT INTO table_name (列1, 列2,...) VALUES (值1, 值2,....)
      UPDATE 表名称 SET 列名称 = 新值 WHERE 列名称 = 某值
    )
*/
/* 
lookup titles -> SELECT MD5 FROM Bulletins WHERE title='${title}'; -> (SELECT都需判断是否已经获取得到数据)
-> if newMD5 != MD5 -> Post new Content -> UPDATE Bulletins SET MD5='', content='', timestamps=''  WHERE title='${title}';

allAsync SELECT serverChanKey, name FROM Subsrcibes -> post Content

*/

async function insertKey(key, name){
  let insertSql = `INSERT INTO Subscriptions (serverChanKey, name, timestamps) VALUES ('${key}', '${name}', '${(new Date()).toUTCString()}')`;
  console.log(insertSql);
  await db.runAsync(insertSql);
  return
}

async function getAllKeys(){
  let getSql = `SELECT serverChanKey FROM Subscriptions`;
  let keyArr = await db.allAsync(getSql);
  console.log(keyArr);
  /*
  * [
      {
        serverChanKey: 'SCU70365Tac8d1645ed4d716bdc01c890677770ac5dfdc08061751'
      }
    ]
   */
  return keyArr;
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


/*
 * 发送至微信
 */
async function push2weixin(){
  let BJEx = await getTyExpress();
  console.log(BJEx);
  let keyArr = await getAllKeys();
  
  for(let row of keyArr){
    const key = row.serverChanKey;
    let scOpt = createPushOpt(key, BJEx.title, BJEx.text);// 创建RP请求
    // TODO 限制并发数
    let res = await rp(scOpt).catch(err=>{throw err});
    console.log('server酱返回值:')
    console.log(res);
  }

}

/* */
async function voteAsync(voter) {
    var val;
    var getStmt = `SELECT Name, Count FROM Voters WHERE Name="${voter}"`;
    console.log(getStmt);
    var row = await db.getAsync(getStmt);
    if (!row) {// 数据为空
        console.log("VOTER NOT FOUND");
        var insertSql = `INSERT INTO Voters (Name, Count) VALUES ("${voter}", 1)`;
        console.log(insertSql);
        await db.runAsync(insertSql);
        val = 1;
        return val;
    }
    else {
        val = row["Count"];
        console.log(`COUNT = ${val}`);
        val += 1;

        // update
        var updateSql = `UPDATE Voters SET Count = ${val} WHERE Name = "${voter}"`;
        console.log(updateSql);
        await db.runAsync(updateSql);
    }

    console.log(`RETURN ${val}`);
    return val;
}

console.log('sqlite3...');
async function main() {
    try {
        var stmt = "CREATE TABLE IF NOT EXISTS Voters (Name TEXT, Count int)";
        console.log(stmt);
        await db.runAsync(stmt);
        var val = await voteAsync("Henry Dam");
        console.log(`New vote for John Doe is ${val}`);
    } 
    catch (e) {
        console.log(JSON.stringify(ex));
    }
}

// main()

// insertKey('SCU70365Tac8d1645ed4d716bdc01c890677770ac5dfdc08061751','test');
// getAllKeys()
push2weixin();