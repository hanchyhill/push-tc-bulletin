
* 步骤

1. sqlite
2. 遍历，抓取文本
3. 得到API，推送
https://www.npmjs.com/package/knex
https://docs.microsoft.com/zh-cn/archive/blogs/yizhang/calling-node-js-sqlite-callback-function-using-promise-and-await
https://gist.github.com/yizhang82/26101c92faeea19568e48224b09e2d1c
https://www.oschina.net/translate/a-sqlite-tutorial-with-node-js
https://www.npmjs.com/package/bookshelf

* Table
* Bulletins = {content:String, name:String, MD5:String, ins:String, timestamps:Time, CNname}
* Subscibes = {serverChanKey:String, name:String, timestamps:Time}
subscription
* config 数据, 列出需要的报文，目录，函数方法等。可以判断Modify Since