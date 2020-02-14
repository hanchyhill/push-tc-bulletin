/* TODO 
        fulltime 日期由Date 对象来转化
*/
const {promisify} = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);
const path = require('path');
const MD5 = require('md5');
const {config} = require('./bulletinConfig.js');

const util = {
  number2str(num,digit){
    return (Array(digit).join('0') + num).slice(-1 * digit);
  },
}

/**
 * 
 * @param {string} chunk 报文
 */
const headFilter = (chunk='')=>{
  return config.regArr.some(item=>item.reg.test(chunk));
}

const scanMeta = (bulletin='')=>{
  const number2str = util.number2str;
  let reg = undefined;
  let time = '';
  let date = undefined;
  let name = undefined;
  let cn = undefined;
  let title = undefined;
  let timestamps = '';
  let today = new Date();
  let utc = [today.getUTCFullYear() ,today.getUTCMonth(), today.getUTCDate()];
  let fulltime = undefined;
  let data = undefined;
  for(let iReg of config.regArr){
    reg = iReg.reg;
    let result = reg.exec(bulletin);
    if(result){
      if(iReg.ins == 'BABJ' && bulletin.includes('\nNIL\r')) break;// 如果BABJ报文为空则中断
      let iTime = result[1];
      let iDay = Number(iTime.slice(0,2));
      let iHour = Number(iTime.slice(2,4));
      let iMinute = Number(iTime.slice(4,6));
      let initTime = new Date(Date.UTC(utc[0],utc[1],iDay,iHour,iMinute));
      let md5 = MD5(bulletin.replace(/ZCZC.*?\d{3}/,'').replace(/ZCZC/,'').replace(/\s/g,'').replace(/NNNN/g,''));//去除ZCZC开头，去除所有空白字符
      if(initTime.getTime()-today.getTime()>0){
        initTime = new Date(Date.UTC(utc[0],utc[1]-1,iDay,iHour,iMinute));
        //fulltime = utc[0].toString() + number2(utc[1]) + number2(iDay) + number2(iHour) + number2(iMinute);
      }// OR today.date<iDay?today.date -1 
      else{
        //fulltime = utc[0].toString() + number2(utc[1]+1) + number2(iDay) + number2(iHour) + number2(iMinute);
      }
      fulltime = initTime.getUTCFullYear().toString() + 
                 number2str(initTime.getUTCMonth()+1,2)  + 
                 number2str(initTime.getUTCDate(),2) + 
                 number2str(initTime.getUTCHours(),2) + 
                 number2str(initTime.getUTCMinutes(),2);
      name = iReg.name;
      cn = iReg.cn;
      date = initTime;
      timestamps = initTime.toUTCString();
      title = result[0] + ' ' + fulltime;
      data = {content:bulletin,name,cn,date,timestamps,fulltime, title,md5:md5,ins:iReg.ins,name:iReg.name};
      break;
    }
  }
  return data;
}

const readDataFromFile = async ()=>{
  const raw = await readFile(path.join(__dirname,'93080200.ABJ'),'ascii');
  resolveData(raw);
}
/**
 * 主执行文件
 */
const resolveData = (raw)=>{
  const rawArr = raw.split('NNNN');
  const catchArr = rawArr.filter(chunk=>headFilter(chunk));
  const dataArr = catchArr.map(scanMeta).filter(data=>data!==undefined);//剔除undefined,BABJ为空的例子
  if(dataArr.length===0){
    // console.log('没有匹配数据');
    return [];
  }
  else{
    return dataArr;
  }
}

exports.readDataFromFile = readDataFromFile;
exports.resolveData = resolveData;
// main()
// .then(v=>{})
// .catch(err=>console.log(err));
