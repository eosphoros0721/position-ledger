# 持仓日记
无AI API的静态持仓记录网站，支持GitHub Pages。

## 记录与导出
多个账户收盘快照、净资产趋势、持仓饼图、CSV明细/汇总、PNG曲线、JSON备份、截图附件。
每日可沿用该账户最近持仓，再更新股数、收盘价和资金。

## 数据位置
持仓和截图保存到当前浏览器IndexedDB，不上传到GitHub。网站代码可以公开，个人持仓不会写入仓库。
更换设备或浏览器、清理网站数据，会无法访问本机记录。定期导出JSON；跨设备通过JSON导入。
JSON不含截图，截图原件请自行保留。两融净资产=市值+现金-负债。快照不能还原日内交易和已实现收益。

## 发布
方式一：把dist目录中的index.html和assets目录上传到仓库根目录，在Settings → Pages中选择Deploy from a branch，main，/(root)。
方式二：上传本源代码，在Settings → Pages中选择GitHub Actions，main分支更新会自动构建部署。
不能直接在文件管理器打开HTML，需通过网站访问，以确保脚本和浏览器数据库正常运行。

## 开发
Node 22.13+，npm install，npm run build。
