# push-tc-bulletin 台风报文推送

## 简介 Intro

利用server酱接口推送台风报文至微信

## 准备 Prepare

1. 依赖Node.js>10.0;
2. 注册server酱 [<http://sc.ftqq.com]>
3. 把server酱的SCKEY导入SQLite数据库

## 安装 Installation

1. npm install(安装sqlite3容易出错)
2. cd ./src/
3. node main.js

## 推送的报文 Bulletins to push

1. JTWC热带气旋生成警报(报头WTPQ3*-PGTW，只发送包含字段'TROPICAL CYCLONE FORMATION ALERT')
2. JMA台风警报(报头WTPQ2-RJTD)
3. 国家气象中心台风快讯
4. 国家气象中心台风警报，定位报，生成报

## SQLite 字段

包含两个表，【Bulletins】和【Subscriptions】，【Subscriptions】中的【serverChanKey】字段是您[server酱](http://sc.ftqq.com)的[SCKEY](http://sc.ftqq.com/?c=code)

### Bulletins

name, cnName, ins, content, MD5, timestamps, lastModified

### Subscriptions

serverChanKey, name, timestamps
