修复[哔哩哔哩 为什么拉黑](https://greasyfork.org/zh-CN/scripts/31615-bilibili-why-blocked)脚本，增加用户空间页拉黑添加原因功能，并添加一些小功能(自动跳过充电页面，单P视频是否自动播放推荐视频，多P视频是否自动播放分P，多P视频是否自动播放推荐视频，番剧是否自动连播，稍后再看是否自动连播)，可能有BUG。

[项目地址](https://github.com/MrSTOP/BilibiliSmallTools)

**B站视频评论区"共xxx条评论 点击查看"按钮加载出的更多评论拉黑对话框不会关闭，这应该是B站自身问题，与本脚本无关**

![B站脚本报错信息](./VideoBlockError.jpg)

**PS:其实点击"确认拉黑"后已经成功拉黑了但是对话框不会关闭，去"个人空间->黑名单管理"可以看到用户已经被拉黑，拉黑的信息也能正常显示**

**PPS:只要显示如下信息应该是拉黑成功了，点取消关掉对话框就行了**

![拉黑提示信息](./VideoBlockInfo.jpg)

**0.5.2.1 修复[个人中心](https://account.bilibili.com/account/home)页面点击"黑名单管理"必须刷新才生效的问题**

**0.5.2.0 修复视频评论区加载更多评论时，对新加载的评论进行拉黑操作无效的问题**

**0.5.1.0 [Material Component Web](https://github.com/material-components/material-components-web)引入破坏性更改，导致开关组件失效，降级至V11.0.0版本**

**0.5.0.0添加对稍后再看页面支持([SingletonData.js](https://greasyfork.org/scripts/31539-singletondata/code/SingletonData.js)依赖已被[作者](https://github.com/cologler/)删除，从过去保存的文件中恢复，可能会引发问题)**

**0.4.6.2可能引入了破坏性更改，为避免问题，有关自动播放的设置已被重置，请重新设置（不影响已保存的拉黑原因）**

如果启用了番剧自动切集功能，番剧播放页面中播放器的设置窗口可能会短暂弹出一下（视频播放器的设置是动态加载的，为实现自动设置功能必须这样操作 PS:通常应该不会出现）

![播放器设置窗口示意图](./VideoSetting.jpg)

评论区拉黑会记录被拉黑用户评论及评论所在网址

![评论区拉黑示意图](./CommentBlock.png)


用户空间拉黑会记录进入用户空间前的网址并可以填写及查看原因

![用户空间拉黑示意图](./SpaceBlock.jpg)


查看和导入导出数据，点击拉黑原因可以在对话框中查看

![黑名单管理示意图](./BlockManage.jpg)

小功能设置按钮

![设置按钮示意图](./SettingDialogButton.jpg)

功能设置对话框

![功能设置对话框示意图](./SettingDialog.jpg)

脚本管理器设置入口

![脚本管理器设置入口](./ScriptManagerSettingEntrance.jpg)
