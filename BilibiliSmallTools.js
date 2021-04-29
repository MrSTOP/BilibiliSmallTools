// ==UserScript==
// @name               哔哩哔哩 小功能
// @namespace          https://github.com/MrSTOP
// @version            0.2.5.4
// @description        记录为什么屏蔽了此人，支持导入导出。添加自动跳过充电页面功能，调整B站恶心的自动连播功能
// @author             MrSTOP
// @license            GPLv3
// @run-at             document-start
// @match              https://account.bilibili.com/account/blacklist
// @match              https://www.bilibili.com/bangumi/*
// @match              https://www.bilibili.com/video/*
// @match              https://space.bilibili.com/*
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_addValueChangeListener
// @grant              GM_removeValueChangeListener
// @grant              GM_addStyle
// @grant              GM_getResourceText
// @require            https://greasyfork.org/scripts/31539-singletondata/code/SingletonData.js
// @require            https://cdn.jsdelivr.net/npm/jquery/dist/jquery.min.js
// @require            https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js
// @resource           material-component-web    https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css
// @resource           material-icons    https://unpkg.com/material-icons@latest/iconfont/material-icons.css
// @noframes
// ==/UserScript==
//是否自动跳过充电界面 true:跳过 false:不跳过
// let SKIP_CHARGE_ENABLED = true;
//===============================================
//是否启用自动连播改变功能(注意以下三项设置仅在启用本设置后生效) true:启用 false:不启用
// let AUTO_PLAY_CHANGE_ENABLED = true;
//单个视频是否启用自动连播 true:启用 false:不启用
// let SINGLE_VIDEO_AUTO_PLAY_ENABLED = false;
//多P视频是否启用分P自动连播 true:启用 false:不启用
// let MULTIPART_VIDEO_AUTO_PLAY_ENABLED = true;
//多P视频是否启用推荐自动连播 true:启用 false:不启用
// let MULTIPART_VIDEO_AUTO_PLAY_RECOMMEND_ENABLED = false;
//===============================================

// 监听XHR请求避免重复请求黑名单导致API被禁用
(function (open) {
  XMLHttpRequest.prototype.open = function () {
    this.addEventListener("readystatechange", function () {
      //   console.log("readystatechange" + this.readyState);
      if (this.readyState === 4) {
        // console.log(this.responseURL);
        // console.log(this.responseText);
        if (
          this.responseURL.includes(
            "https://api.bilibili.com/x/relation/blacks"
          )
        ) {
          // 延迟一下避免黑名单列表没加载好
          setTimeout(() => {
            $(document).trigger("relationBlacksXHRResponse", [
              JSON.parse(this.responseText),
            ]);
          }, 500);
        } else if (
          this.responseURL.includes(
            "https://api.bilibili.com/x/relation/modify"
          )
        ) {
          // setTimeout(() => {
          $(document).trigger("relationModifyXHRResponse", [
            JSON.parse(this.responseText),
          ]);
          // }, 500);
        } else if (
          this.responseURL.includes(
            "https://api.bilibili.com/x/player/pagelist"
          )
        ) {
          $(document).trigger("playerPageListXHRResponse", [
            JSON.parse(this.responseText),
          ]);
        } else if (
          this.responseURL.includes("https://api.bilibili.com/x/player/v2")
        ) {
          $(document).trigger("playerV2XHRResponse", [
            JSON.parse(this.responseText),
          ]);
        }
      }
    });
    open.apply(this, arguments);
  };
})(XMLHttpRequest.prototype.open);

// just let type script work.
(function () {
  function require() {}
  require("greasemonkey");
})();

(function () {
  "use strict";

  let MDCSnackbar;
  let jQ_MDCSnackbar;
  let MDCDialog;
  // let uid = document.cookie.match(/(?<=DedeUserID=).+?(?=;)/)[0];
  let crsfToken = document.cookie.match(/(?<=bili_jct=).+?(?=;)/)[0];

  GM_addStyle(GM_getResourceText("material-component-web"));
  GM_addStyle(GM_getResourceText("material-icons"));
  GM_addStyle(
    ".mdc-list-item{height:32px;padding:20px 0px 0px 14px}.mdc-list-item__text{padding-left:10px}"
  );
  class BlockController {
    constructor() {
      this._singletonData = new SingletonData("blocked-reasons", {});
    }

    // blockUser(userId, url, type, content) {
    //   if (Bilibili.badlistUser === undefined) {
    //     throw "API error";
    //   }
    //   Bilibili.badlistUser("", userId, () => {});
    //   this.addReason(userId, url, type, content);
    // }

    addReason(userId, url, type, content, autoSave = true) {
      let data = {
        key: userId,
        url: url,
        type: type,
        content: content,
      };
      this._singletonData.data[userId] = data;
      if (autoSave) {
        this._singletonData.save();
      }
    }

    getReason(userId) {
      return this._singletonData.data[userId] || null;
    }

    removeReason(userId) {
      delete this._singletonData.data[userId];
      this._singletonData.save();
    }

    export() {
      let data = JSON.stringify(this._singletonData.data);
      let blob = new Blob([data], { type: "text/json" });
      let url = window.URL.createObjectURL(blob);
      var elem = window.document.createElement("a");
      elem.href = url;
      elem.download = "data.json";
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }

    // canImport() {
    //   return Bilibili && typeof Bilibili.badlistUser === "function";
    // }

    // _ServerSiteBlockAsync(id) {
    //   return new Promise((resolve, reject) => {
    //     Bilibili.badlistUser("", id, (e) => {
    //       console.log(e);
    //       resolve(e.code === 0);
    //     });
    //   });
    // }

    // async import(content) {
    //   let data = null;
    //   try {
    //     data = JSON.parse(content);
    //   } catch (_) {
    //     toastr.info("This is not a vaild json file.");
    //   }

    //   let hasError = false;
    //   if (data) {
    //     let added = 0;
    //     let exists = 0;
    //     let errors = 0;
    //     let values = Object.values(data);
    //     for (let i = 0; i < values.length; i++) {
    //       let z = values[i];
    //       if (
    //         "string" === typeof z.key &&
    //         "string" === typeof z.url &&
    //         "string" === typeof z.type &&
    //         "string" === typeof z.content
    //       ) {
    //         if (this.getReason(z.key) === null) {
    //           if (await this._ServerSiteBlockAsync(z.key)) {
    //             this.addReason(z.key, z.url, z.type, z.content);
    //             added++;
    //           } else {
    //             errors++;
    //           }
    //         } else {
    //           exists++;
    //         }
    //       }
    //     }

    //     if (added + errors + exists > 0) {
    //       toastr.info(
    //         [
    //           `Total imported ${added + errors + exists} items,`,
    //           `added ${added}, exists ${exists}, error ${errors}.`,
    //         ].join("<br>")
    //       );
    //       return;
    //     }
    //   }

    //   toastr.info(`No items has be imported.`);
    // }

    _ServerSiteBlockAsync2(id) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: "//api.bilibili.com/x/relation/modify",
          type: "post",
          dataType: "json",
          xhrFields: {
            withCredentials: true,
          },
          data: {
            fid: id,
            act: 5, //1是关注，2是取关，5是拉黑，6是取消拉黑
            re_src: 11, //?
            jsonp: "jsonp",
            csrf: crsfToken,
          },
          success: function (result, status, xhr) {
            console.log("===============================");
            console.log(result);
            console.log(status);
            console.log(xhr);
            console.log("===============================");
            resolve(result.code === 0);
          },
          error: function (xhr, status, error) {
            console.log("===============================");
            console.log(xhr);
            console.log(status);
            console.log(error);
            console.log("===============================");
            reject(error);
          },
        });
        // Bilibili.badlistUser("", id, (e) => {
        //   console.log(e);
        //   resolve(e.code === 0);
        // });
      });
    }

    async import2(content) {
      let data = null;
      try {
        data = JSON.parse(content);
      } catch (_) {
        showMDCSnackbar("这不是有效的JSON文件.");
        return;
      }

      let hasError = false;
      if (data) {
        let added = 0;
        let exists = 0;
        let errors = 0;
        let values = Object.values(data);
        for (let i = 0; i < values.length; i++) {
          let z = values[i];
          if (
            "string" === typeof z.key &&
            "string" === typeof z.url &&
            "string" === typeof z.type &&
            "string" === typeof z.content
          ) {
            if (this.getReason(z.key) === null) {
              if (await this._ServerSiteBlockAsync2(z.key)) {
                this.addReason(z.key, z.url, z.type, z.content);
                added++;
              } else {
                errors++;
              }
            } else {
              exists++;
            }
          }
        }

        if (added + errors + exists > 0) {
          showMDCSnackbar(
            [
              `共导入 ${added + errors + exists} 项,`,
              `新增 ${added}项, 存在 ${exists}项, 错误 ${errors}项.`,
            ].join("<br>")
          );
          return;
        }
      }
      showMDCSnackbar(`没有项目被导入.`);
    }
  }
  class SettingsStorage {
    constructor() {
      this._singletonData = new SingletonData("settings", {
        skipCharge: true,
        autoPlayChange: true,
        singleVideoAutoPlayRecommend: false,
        multipartVideoAutoPlay: true,
        multipartVideoAutoPlayRecommend: false,
      });
    }

    saveSettings(settings) {
      this._singletonData.data = settings;
      this._singletonData.save();
    }

    loadSettings() {
      return this._singletonData.data;
    }
  }

  let blockReason = new BlockController();
  let settingsStorage = new SettingsStorage();
  let currentSettings = settingsStorage.loadSettings();

  function xmlEscape(s) {
    return $("<div/>").text(s).html();
  }
  let blackListRegEx = /https\:\/\/account\.bilibili\.com\/account\/blacklist/;
  let spaceRegEx = /https:\/\/space\.bilibili\.com\/[0-9]+/;
  let midFromSpaceUrlRegEx = /[0-9]+/;

  function showMDCSnackbar(info) {
    MDCSnackbar.close();
    $(jQ_MDCSnackbar).find(".mdc-snackbar__label").html(info);
    MDCSnackbar.open();
  }
  let VIDEO_PAGE_PLAY_LIST_OBJ;
  function onVideoPage() {
    let observer = new MutationObserver((mutationRecords, instance) => {
      mutationRecords.forEach((mutationRecord) => {
        //没有添加节点
        if (mutationRecord.addedNodes.length === 0) {
          return;
        }
        if (
          $(".bilibili-player-electric-panel-jump-content").length !== 0 &&
          currentSettings.skipCharge
        ) {
          //console.log(mutationRecord);
          $(".bilibili-player-electric-panel-jump-content")[0].click();
          console.log("跳过充电");
        }
        mutationRecord.addedNodes.forEach((node) => {
          // console.log(node.classList.contains("blacklist"));
          //   if ($(node).hasClass("r-con")) {
          //     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
          //     console.log($(node));
          //     console.log($(node).attr("class"));
          //     console.log(
          //       $(node)
          //         .find(".head-right")
          //         .before('<span class="material-icons mdc-theme--primary" style="font-size: 18px;">settings</span >')
          //     );
          //     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
          //   }
          if ($(node).hasClass("list-item")) {
            $(node).find("li.blacklist").on({
              click: blackButtonClickHandler,
            });
          }
          if ($(node).hasClass("comment-bilibili-blacklist")) {
            $(node).find("a.blacklist-confirm").on({
              click: confirmBlackClickHandler,
            });
          }
        });
      });
      //   let blackButton = $("div.comment-list div.opera-list>ul>li.blacklist");
      //   if (blackButton[0]) {
      //     blackButton.off("click", blackButtonClickHandler);
      //     blackButton.on({
      //       click: blackButtonClickHandler,
      //     });
      //   }
      //   let blackListConfirm = $(".comment-bilibili-blacklist");
      //   if (blackListConfirm[0]) {
      //     blackListConfirm.off("click", confirmBlackClickHandler);
      //     let btn = $(".comment-bilibili-blacklist .comment-bilibili-con .blacklist-confirm");
      //     btn.on({
      //       click: confirmBlackClickHandler,
      //     });
      //   }
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
    });

    $("body").ready(() => {
      $("body").prepend(
        `<div style="position: absolute;right: 0.5%; top: 30%">
        <button id="OpenSettingDialogButton" class="mdc-icon-button material-icons" data-tooltip-id="AutoPlaySettingButtonTooltip" aria-label="toggle favorite" data-tooltip-id="tooltip-id">settings</button>
        <div id="AutoPlaySettingButtonTooltip" class="mdc-tooltip" role="tooltip"  data-mdc-tooltip-persist="false" aria-hidden="true">
        <div class= "mdc-tooltip__surface">自动播放设置</div>
        </div>
        </div>

        <div id="AutoPlaySettingDialog" class="mdc-dialog" style="z-index: 1001">
        <div class="mdc-dialog__container">
        <div class="mdc-dialog__surface" role="alertdialog" aria-modal="true" aria-labelledby="AutoPlaySettingDialogTitle" aria-describedby="my-dialog-content">
        <h2 class="mdc-dialog__title" id="AutoPlaySettingDialogTitle">自动播放设置</h2>
        
        <div class="mdc-dialog__content" id="">
        <ul id="AutoPlaySettingOptionList" class="mdc-list" role="group" aria-label="List with switch items">
        <li class="mdc-list-item" role="switch" aria-checked="false">
        <span class="mdc-list-item__graphic">
        <div id="SettingSkipCharge" class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="SettingSkipChargeInput" class="mdc-switch__native-control">
        </div>
        </div>
        </div>
        </span>
        <label class="mdc-list-item__text" for="SettingSkipChargeInput">是否自动跳过充电界面</label>
        </li>
        <li class="mdc-list-item" role="switch" tabindex="0">
        <span class="mdc-list-item__graphic">
        <div id="SettingAutoPlayChange" class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="SettingAutoPlayChangeInput" class="mdc-switch__native-control">
        </div>
        </div>
        </div>
        </span>
        <label class="mdc-list-item__text" for="SettingAutoPlayChangeInput">是否启用自动连播改变功能(注意以下三项设置仅在启用本设置后生效)</label>
        </li>
        <li class="mdc-list-item" role="switch" tabindex="1">
        <span class="mdc-list-item__graphic">
        <div id="SettingSingleVideoAutoPlayRecommend" class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="SettingSingleVideoAutoPlayRecommendInput" class="mdc-switch__native-control">
        </div>
        </div>
        </div>
        </span>
        <label class="mdc-list-item__text" for="SettingSingleVideoAutoPlayRecommendInput">单个视频是否启用自动连播</label>
        </li>
        <li class="mdc-list-item" role="switch" tabindex="2">
        <span class="mdc-list-item__graphic">
        <div id="SettingMultipartVideoAutoPlay" class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="SettingMultipartVideoAutoPlayInput" class="mdc-switch__native-control">
        </div>
        </div>
        </div>
        </span>
        <label class="mdc-list-item__text" for="SettingMultipartVideoAutoPlayInput">多P视频是否启用分P自动连播</label>
        </li>
        <li class="mdc-list-item" role="switch" tabindex="3">
        <span class="mdc-list-item__graphic">
        <div id="SettingMultipartVideoAutoPlayRecommend" class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="SettingMultipartVideoAutoPlayRecommendInput" class="mdc-switch__native-control">
        </div>
        </div>
        </div>
        </span>
        <label class="mdc-list-item__text" for="SettingMultipartVideoAutoPlayRecommendInput">多P视频是否启用推荐自动连播</label>
        </li>
        </ul>
        <!--<ul id="AutoPlaySettingOptionList" class="mdc-list" role="group" aria-label="List with switch items">
        <li class="mdc-list-item" role="switch" aria-checked="false">
        <label class="mdc-list-item__text" for="SettingMultipartVideoAutoPlayRecommend">多P视频是否启用推荐自动连播</label>
        <span class="mdc-list-item__meta">
        <div class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="SettingMultipartVideoAutoPlayRecommend" class="mdc-switch__native-control">
        </div>
        </div>
        </div>
        </span>
        </li>
        <li class=mdc-list-item" role="switch" aria-checked="true" tabindex="0">
        <label class="mdc-list-item__text" for="demo-list2-switch-item-2">Option 2</label>
        <span class="mdc-list-item__meta">
        <div class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="demo-list2-switch-item-2" class="mdc-switch__native-control" checked>
        </div>
        </div>
        </div>
        </span>
        </li>
        <li class="mdc-list-item" role="switch" aria-checked="false">
        <label class="mdc-list-item__text" for="demo-list2-switch-item-3">多P视频是否启用推荐自动连播</label>
        <span class="mdc-list-item__meta">
        <div class="mdc-switch">
        <div class="mdc-switch__track"></div>
        <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
        <input type="checkbox" id="demo-list2-switch-item-3" class="mdc-switch__native-control">
        </div>
        </div>
        </div>
        </span>
        </li>
        </ul>-->

        </div>
        <div class="mdc-dialog__actions">
        <button id="SettingDialogCancelButton" type="button" class="mdc-button mdc-dialog__button">
        <div class="mdc-button__ripple"></div>
        <span class="mdc-button__label">取消</span>
        </button>
        <button id="SettingDialogConfirmButton" type="button" class="mdc-button mdc-dialog__button">
        <div class="mdc-button__ripple"></div>
        <span class="mdc-button__label">保存</span>
        </button>
        </div>
        </div>
        </div>
        <div class="mdc-dialog__scrim"></div>
        </div>
        <div id="MDCSnackbar" class="mdc-snackbar" style="top: 0;bottom: inherit;z-index: 10001">
        <div class="mdc-snackbar__surface" role="status" aria-relevant="additions">
        <div class="mdc-snackbar__label" aria-atomic="false"></div>
        <div class="mdc-snackbar__actions" aria-atomic="true">
        </div>
        </div>
        </div>`
      );
      //JQuery prepend不太稳定，等待JQuery注入完成
      setTimeout(() => {
        jQ_MDCSnackbar = $("#MDCSnackbar");
        MDCSnackbar = mdc.snackbar.MDCSnackbar.attachTo(jQ_MDCSnackbar[0]);
        MDCDialog = mdc.dialog.MDCDialog.attachTo(
          $("#AutoPlaySettingDialog")[0]
        );
        let settingList = mdc.list.MDCList.attachTo($("#AutoPlaySettingOptionList")[0]);
        let tooltip = mdc.tooltip.MDCTooltip.attachTo(
          $("#AutoPlaySettingButtonTooltip")[0]
        );
        let jQ_SkipChargeSwitch = $("#SettingSkipCharge");
        let jQ_AutoPlayChangeSwitch = $("#SettingAutoPlayChange");
        let jQ_SingleVideoAutoPlayRecommendSwitch = $(
          "#SettingSingleVideoAutoPlayRecommend"
        );
        let jQ_MultipartVideoAutoPlaySwitch = $(
          "#SettingMultipartVideoAutoPlay"
        );
        let jQ_MultipartVideoAutoPlayRecommendSwitch = $(
          "#SettingMultipartVideoAutoPlayRecommend"
        );

        let skipChargeSwitch = mdc.switchControl.MDCSwitch.attachTo(
          jQ_SkipChargeSwitch[0]
        );
        let autoPlayChangeSwitch = mdc.switchControl.MDCSwitch.attachTo(
          jQ_AutoPlayChangeSwitch[0]
        );
        let singleVideoAutoPlayRecommendSwitch = mdc.switchControl.MDCSwitch.attachTo(
          jQ_SingleVideoAutoPlayRecommendSwitch[0]
        );
        let multipartVideoAutoPlaySwitch = mdc.switchControl.MDCSwitch.attachTo(
          jQ_MultipartVideoAutoPlaySwitch[0]
        );
        let multipartVideoAutoPlayRecommendSwitch = mdc.switchControl.MDCSwitch.attachTo(
          jQ_MultipartVideoAutoPlayRecommendSwitch[0]
          );
          jQ_AutoPlayChangeSwitch.on({
              change: () => {
              if (autoPlayChangeSwitch.checked) {
                  settingList.setEnabled([2], true);
                  singleVideoAutoPlayRecommendSwitch.disabled = false;
                  settingList.setEnabled([3], true);
                  multipartVideoAutoPlaySwitch.disabled = false;
                  settingList.setEnabled([4], true);
                  multipartVideoAutoPlayRecommendSwitch.disabled = false;
              } else {
                  settingList.setEnabled([2], false);
                  singleVideoAutoPlayRecommendSwitch.disabled = true;
                  settingList.setEnabled([3], false);
                  multipartVideoAutoPlaySwitch.disabled = true;
                  settingList.setEnabled([4], false);
                  multipartVideoAutoPlayRecommendSwitch.disabled = true;
              }
          }})
        $("#OpenSettingDialogButton").on({
          click: () => {
            currentSettings = settingsStorage.loadSettings();
            skipChargeSwitch.checked = currentSettings.skipCharge;
            autoPlayChangeSwitch.checked = currentSettings.autoPlayChange;
            singleVideoAutoPlayRecommendSwitch.checked =
              currentSettings.singleVideoAutoPlayRecommend;
            multipartVideoAutoPlaySwitch.checked =
              currentSettings.multipartVideoAutoPlay;
            multipartVideoAutoPlayRecommendSwitch.checked =
              currentSettings.multipartVideoAutoPlayRecommend;
            showMDCSnackbar("设置加载成功");
            MDCDialog.open();
          },
          mouseenter: () => {
            $("#AutoPlaySettingButtonTooltip").show();
          },
          mouseleave: () => {
            $("#AutoPlaySettingButtonTooltip").hide();
          },
        });
        $("#SettingDialogCancelButton").on({
          click: () => {
            MDCDialog.close();
          },
        });
        $("#SettingDialogConfirmButton").on({
          click: () => {
            currentSettings.skipCharge = skipChargeSwitch.checked;
            currentSettings.autoPlayChange = autoPlayChangeSwitch.checked;
            currentSettings.singleVideoAutoPlayRecommend =
              singleVideoAutoPlayRecommendSwitch.checked;
            currentSettings.multipartVideoAutoPlay =
              multipartVideoAutoPlaySwitch.checked;
            currentSettings.multipartVideoAutoPlayRecommend =
              multipartVideoAutoPlayRecommendSwitch.checked;
            settingsStorage.saveSettings(currentSettings);
            showMDCSnackbar("设置保存成功");
            MDCDialog.close();
          },
        });
      }, 0);
    });

    $(document).on({
      playerPageListXHRResponse: (event, playlistObj) => {
        if (!currentSettings.autoPlayChange) {
          return;
        }
        VIDEO_PAGE_PLAY_LIST_OBJ = playlistObj;
        if (playlistObj.data.length === 1) {
          let autoPlayButton = $("#reco_list").find(
            ".next-play .next-button .switch-button"
          );
          // console.log(playNextList);
          // console.log(autoPlayButton);
          console.log("检测到无分P视频");
          if (autoPlayButton.hasClass("on")) {
            console.log("推荐自动连播处于开启状态");
            if (!currentSettings.singleVideoAutoPlayRecommend) {
              autoPlayButton.click();
              console.log("已关闭推荐自动连播");
            }
          } else {
            console.log("推荐自动连播处于关闭状态");
            if (currentSettings.singleVideoAutoPlayRecommend) {
              autoPlayButton.click();
              console.log("已开启推荐自动连播");
            }
          }
        } else {
          let autoPlayButton = $("#multi_page").find(
            ".next-button .switch-button"
          );
          // console.log(playNextList);
          // console.log(autoPlayButton);
          // console.log(
          //   autoPlayButton.getElementsByClassName("switch-button")[0]
          // );
          // console.log(
          //   autoPlayButton.getElementsByClassName("switch-button on")[0]
          // );
          console.log("检测到有分P视频");
          if (!autoPlayButton.hasClass("on")) {
            console.log("自动连播处于关闭状态");
            if (currentSettings.multipartVideoAutoPlay) {
              autoPlayButton.click();
              console.log("已开启自动连播");
            }
          } else {
            console.log("自动连播处于开启状态");
            if (!currentSettings.multipartVideoAutoPlay) {
              autoPlayButton.click();
              console.log("已关闭自动连播");
            }
          }
        }
      },
      playerV2XHRResponse: (event, v2Obj) => {
        if (!currentSettings.autoPlayChange) {
          return;
        }
        if ($("#multi_page").length === 0) {
          return;
        }
        if (
          v2Obj.data.cid ===
          VIDEO_PAGE_PLAY_LIST_OBJ.data[
            VIDEO_PAGE_PLAY_LIST_OBJ.data.length - 1
          ].cid
        ) {
          console.log("分P视频最后一P");
          let autoPlayButton = $("#multi_page").find(
            ".next-button .switch-button"
          );
          if (!autoPlayButton.hasClass("on")) {
            console.log("自动连播处于关闭状态");
            if (currentSettings.multipartVideoAutoPlayRecommend) {
              autoPlayButton.click();
              console.log("已开启自动连播");
            }
          } else {
            console.log("自动连播处于开启状态");
            if (!currentSettings.multipartVideoAutoPlayRecommend) {
              autoPlayButton.click();
              console.log("已关闭自动连播");
            }
          }
        }
      },
    });

    let lastCommentUser = null;
    function blackButtonClickHandler(event) {
      let parents = $(event.target).parentsUntil(".list-item");
      let root = null;
      let text = null;
      let type = null;
      if (parents.length === 5) {
        // comment
        type = "comment";
        root = parents[4];
        text = root.querySelector(".text").innerText;
      } else if (parents.length === 7) {
        type = "comment-in-comment";
        root = parents[4];
        text = root.querySelector(".text-con").innerText;
      }

      if (root === null) {
        console.log(parents);
        showMDCSnackbar("发生错误");
        return;
      }
      let a = root.querySelector(".user a");
      let userId = a.dataset.usercardMid;
      let userName = a.innerText;
      let commentData = {
        userId: userId,
        userName: userName,
        content: text,
        type: type,
      };
      //   console.log(text);
      //   console.log(type);
      //   console.log(commentData);
      lastCommentUser = commentData;
      showMDCSnackbar("用户评论信息解析完成");
    }
    function confirmBlackClickHandler() {
      if (lastCommentUser !== null) {
        // console.log("lastCommentUser");
        // console.log(lastCommentUser);
        let url = window.location.href;
        $(document).one({
          relationModifyXHRResponse: (event, resultObj) => {
            // console.log(resultObj);
            if (resultObj.code === 0) {
              showMDCSnackbar(
                [
                  xmlEscape(`Blocked ${lastCommentUser.userName}`),
                  xmlEscape(`Id: ${lastCommentUser.userId}`),
                  xmlEscape("Reason:"),
                  xmlEscape(lastCommentUser.content),
                ].join("<br>")
              );
              blockReason.addReason(
                lastCommentUser.userId,
                url,
                lastCommentUser.type,
                lastCommentUser.content
              );
            } else {
              showMDCSnackbar(resultObj.message);
            }
          },
        });
      } else {
        showMDCSnackbar("添加拉黑理由失败</br>lastCommentUser为null");
      }
    }
  }

  function onManagePage() {
    let observer = new MutationObserver((mutationsList, instance) => {
      let buttonDiv = $("#app>div>div>div>div.security-right-title");
      if (buttonDiv[0]) {
        buttonDiv.append(
          `<div style="float: right;padding: 7px">
            <input id="ImportFileInput" type="file" hidden accept="application/json">
            <button id="ImportDataButton" class="mdc-button mdc-button--outlined">
            <span class="mdc-button__ripple"></span>
            <span class="mdc-button__label">导入</span>
            </button>
            <span style="padding: 8px"></span>
            <button id="ExportDataButton" class="mdc-button mdc-button--outlined">
            <span class="mdc-button__ripple"></span>
            <span class="mdc-button__label">导出</span>
            </button>
            </div>`
        );
        let importButton = mdc.ripple.MDCRipple.attachTo(
          $("#ImportDataButton")[0]
        );
        let exportButton = mdc.ripple.MDCRipple.attachTo(
          $("#ExportDataButton")[0]
        );

        $("#ImportFileInput").on({
          change: (e) => {
            let file = e.target.files[0];
            if (!file) {
              return;
            }
            let reader = new FileReader();
            reader.onload = (x) => {
              var contents = x.target.result;
              blockReason.import2(contents);
            };
            reader.readAsText(file);
          },
        });
        $("#ImportDataButton").on({
          click: () => {
            // if (blockReason.canImport()) {
            $("#ImportFileInput").trigger("click");
            // } else {
            //   showSnackBar(
            //     snackbar,
            //     $("#MDCSnackbar"),
            //     "Cannot import because of API is invalid."
            //   );
            // }
          },
        });
        $("#ExportDataButton").on({
          click: () => {
            blockReason.export();
            showMDCSnackbar("导出完成");
          },
        });
        instance.disconnect();
        return;
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
    });

    $("body").ready(() => {
      $("body").prepend(
        `<div id="blackReasonDialog" class="mdc-dialog" style="z-index:20001" aria-modal="true">
          <div class="mdc-dialog__container" style="width: 100%">
          <div class="mdc-dialog__surface" style="width: 100%" role="alertdialog" aria-modal="true" aria-labelledby="blackReasonDialogTitle" aria-describedby="my-dialog-content">
          <h2 class="mdc-dialog__title" id="blackReasonDialogTitle">
          <a target="_blank" style="word-break: break-word"></a>
          </h2>
          <div class="mdc-dialog__content" id="blackDetails">
          </div>
          <div class="mdc-dialog__actions">
          <button id="blackReasonDialogConfirmButton" type="button" class="mdc-button mdc-dialog__button">
          <div class="mdc-button__ripple"></div>
          <span class="mdc-button__label">确认</span>
          </button>
          </div>
          </div>
          </div>
          <div class="mdc-dialog__scrim"></div></div>
          <div id="MDCSnackbar" class="mdc-snackbar" style="top: 0;bottom: inherit;z-index: 1001">
          <div class="mdc-snackbar__surface" role="status" aria-relevant="additions">
          <div class="mdc-snackbar__label" aria-atomic="false">Can\'t send photo.Retry in 5 seconds.</div>
          <div class="mdc-snackbar__actions" aria-atomic="true">
          </div>
          </div>
          </div>`
      );
      //JQuery prepend不太稳定，等待JQuery注入完成
      setTimeout(() => {
        jQ_MDCSnackbar = $("#MDCSnackbar");
        MDCDialog = mdc.dialog.MDCDialog.attachTo($(".mdc-dialog")[0]);
        MDCSnackbar = mdc.snackbar.MDCSnackbar.attachTo(jQ_MDCSnackbar[0]);
        $("#blackReasonDialogConfirmButton").on({
          click: function () {
            MDCDialog.close();
          },
        });
      }, 0);
    });
    // snackbar.open();
    $(document).on({
      relationBlacksXHRResponse: function (event, blackListObj) {
        // console.log("OBJ");
        // console.log(blackListObj);
        // console.log("code");
        // console.log(blackListObj.code);
        // console.log("message");
        // console.log(blackListObj.message);
        // console.log("ttl");
        // console.log(blackListObj.ttl);
        // console.log("data");
        // console.log(blackListObj.data);
        // console.log("data.list");
        // console.log(blackListObj.data.list);
        // console.log("data.re_version");
        // console.log(blackListObj.data.re_version);
        // console.log("data.total");
        // console.log(blackListObj.data.total);
        if (blackListObj.code === 0) {
          $(".black-ul>li>span:nth-of-type(3)").each(function (index, element) {
            //   console.log(index);
            //   console.log("MID", result.data.list[index].mid);
            let removeBtn = $(element);
            removeBtn.attr("mid", blackListObj.data.list[index].mid);
            let userName = $(element).prev().children("i.black-name");
            userName.css("color", "#00a1d7");
            userName.css("cursor", "pointer");
            userName.off("click");
            userName.on({
              click: function () {
                window.open(
                  "https://space.bilibili.com/" +
                    $(this)
                      .parentsUntil(".black-list")
                      .parent()
                      .find("span.black-btn")
                      .attr("mid"),
                  "_blank"
                );
              },
            });
            let data = blockReason.getReason(blackListObj.data.list[index].mid);
            removeBtn.on({
              click: () => {
                $(document).one({
                  relationModifyXHRResponse: (event, resultObj) => {
                    // console.log(resultObj);
                    if (resultObj.code === 0) {
                      blockReason.removeReason($(element).attr("mid"));
                      showMDCSnackbar("删除拉黑理由完成");
                    } else {
                      showMDCSnackbar(resultObj.message);
                    }
                  },
                });
              },
            });
            let root = removeBtn.parent();
            $(root).children(".blockReasonDiv").remove();
            if (data !== null) {
              //   console.log(root);
              //   console.log(element);
              let div = document.createElement("div");
              div.className = "blockReasonDiv";
              div.style.width = "600px";
              div.style.padding = "4px 0";
              div.style.lineHeight = "150%";

              $(div).append("在");

              if (
                data.url !== undefined &&
                data.url !== null &&
                data.url !== ""
              ) {
                let url = document.createElement("a");
                url.href = data.url;
                url.innerHTML = "此页面";
                $(div).append(url);
              } else {
                $(div).append("未知页面");
              }

              $(div).append("拉黑 因为:");
              $(div).append("<br>");
              let p = document.createElement("p");
              p.style.textOverflow = "ellipsis";
              p.style.whiteSpace = "nowrap";
              p.style.overflow = "hidden";
              p.innerHTML = data.content;
              $(div).append(p);

              $(root).append(div);
              $(p).on({
                click: function () {
                  let reason = blockReason.getReason(
                    $(this)
                      .parentsUntil(".black-list")
                      .parent()
                      .find("span.black-btn")
                      .attr("mid")
                  );
                  //   console.log(reason);
                  $("#blackReasonDialog")
                    .find("h2#blackReasonDialogTitle>a")
                    .html(decodeURIComponent(reason.url));
                  $("#blackReasonDialog")
                    .find("h2#blackReasonDialogTitle>a")
                    .attr("href", reason.url);
                  $("#blackReasonDialog")
                    .find("div#blackDetails")
                    .html(reason.content);
                  MDCDialog.open();
                },
              });
            }
          });
        } else {
          alert(blackListObj.message);
        }
      },
    });
  }

  function onSpacePage() {
    let observer = new MutationObserver((mutationRecords, instance) => {
      mutationRecords.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          let blackOperationLi = $(node).find(
            "div.h-action>div.h-add-to-black>ul>li:nth-of-type(1)"
          );
          let followButton = $(node).find("div.h-action>span.h-unfollow");
          if (blackOperationLi[0]) {
            if (blackOperationLi.html().includes("加入黑名单")) {
              blackOperationLi.on({
                click: addToBlackListClickHandler,
              });
            } else if (blackOperationLi.html().includes("移除黑名单")) {
              blackOperationLi.on({
                click: removeFromBlackListClickHandler,
              });
              followButton.on({
                click: removeFromBlackListClickHandler,
              });
            } else {
              showMDCSnackbar("无法识别操作，请考虑报告错误");
            }
            instance.disconnect();
          }
        });
      });
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
    });

    let mid = midFromSpaceUrlRegEx.exec(window.location.href)[0];
    if (mid === undefined || mid === null || mid === "") {
      alert("Mid get failed. Script will not work");
      return;
    }
    $("body").ready(() => {
      $("body").prepend(
        `<div id="blackReasonDialog" class="mdc-dialog" style="z-index:20001" aria-modal="true">
          <div class="mdc-dialog__container" style="width: 100%">
          <div class="mdc-dialog__surface" style="width: 100%" role="alertdialog" aria-modal="true" aria-labelledby="blackReasonDialogTitle" aria-describedby="my-dialog-content">
          <h2 class="mdc-dialog__title" id="blackReasonDialogTitle">拉黑原因</h2>
          <div class="mdc-dialog__content" style="padding-top: 10px">
          <label class="mdc-text-field mdc-text-field--outlined"  style="width: 100%">
          <span class="mdc-notched-outline">
          <span class="mdc-notched-outline__leading"></span>
          <span class="mdc-notched-outline__notch">
          <span class="mdc-floating-label" id="blockFromUrlLabel">Url</span>
          </span>
          <span class="mdc-notched-outline__trailing"></span>
          </span>
          <input id="blackUrlInput" type="text" class="mdc-text-field__input" aria-labelledby="blockFromUrlLabel">
          </label>
          </br>
          </br>
          <label class="mdc-text-field mdc-text-field--outlined mdc-text-field--textarea" style="width: 100%">
          <span class="mdc-notched-outline">
          <span class="mdc-notched-outline__leading"></span>
          <span class="mdc-notched-outline__notch">
          <span class="mdc-floating-label" id="blockReason">原因</span>
          </span>
          <span class="mdc-notched-outline__trailing"></span>
          </span>
          <span class= "mdc-text-field__resizer">
          <textarea id="blackReasonTextArea" class="mdc-text-field__input" rows="8" aria-labelledby="blockReason"></textarea> 
          </span>
          </label>
          </div>
          <div class="mdc-dialog__actions">
          <button id="blackReasonDialogCancelButton" type="button" class="mdc-button mdc-dialog__button">
          <div class="mdc-button__ripple"></div>
          <span class="mdc-button__label">取消</span>
          </button>
          <button id="blackReasonDialogConfirmButton" type="button" class="mdc-button mdc-dialog__button">
          <div class="mdc-button__ripple"></div>
          <span class="mdc-button__label">确认</span>
          </button>
          </div>
          </div>
          </div>
          <div class="mdc-dialog__scrim"></div></div>
          <div id="MDCSnackbar" class="mdc-snackbar" style="top: 0;bottom: inherit;z-index: 1001">
          <div class="mdc-snackbar__surface" role="status" aria-relevant="additions">
          <div class="mdc-snackbar__label" aria-atomic="false">Can\'t send photo.Retry in 5 seconds.</div>
          </div>
          </div>`
      );
      //JQuery prepend不太稳定，等待JQuery注入完成
      setTimeout(() => {
        jQ_MDCSnackbar = $("#MDCSnackbar");
        MDCSnackbar = mdc.snackbar.MDCSnackbar.attachTo(jQ_MDCSnackbar[0]);
        $(".mdc-text-field").each((index, element) => {
          mdc.textField.MDCTextField.attachTo($(element)[0]);
        });
        $(".mdc-button").each((index, element) => {
          mdc.ripple.MDCRipple.attachTo($(element)[0]);
        });
        MDCDialog = mdc.dialog.MDCDialog.attachTo($(".mdc-dialog")[0]);
        // console.log(dialog.scrimClickAction);
        MDCDialog.scrimClickAction = "";
        MDCDialog.escapeKeyAction = "";
        $("#blackReasonDialogCancelButton").on({
          click: function () {
            console.log("CLICK");
            let blackConfirmDialog = $("body>div.modal-container");
            blackConfirmDialog.each((index, element) => {
              if ($(element).css("display") !== "none") {
                $(element).find("div>div>a.default")[0].click();
              }
            });
            MDCDialog.close();
          },
        });
        $("#blackReasonDialogConfirmButton").on({
          click: function () {
            console.log("CLICK");
            let url = $("#blackUrlInput").val();
            let content = $("#blackReasonTextArea").val();
            // console.log("mid");
            // console.log(mid);
            // console.log("url");
            // console.log(url);
            // console.log("type");
            // console.log("barrage");
            // console.log("content");
            // console.log(content);
            let blackConfirmDialog = $("body>div.modal-container");
            blackConfirmDialog.each((index, element) => {
              if ($(element).css("display") !== "none") {
                // console.log($(element));
                $(element).find("div>div>a.primary")[0].click();
                MDCDialog.close();
              }
            });
            $(document).one({
              relationModifyXHRResponse: (event, resultObj) => {
                // console.log(resultObj);
                if (resultObj.code === 0) {
                  let blackOperationLi = $(document).find(
                    "div.h-action>div.h-add-to-black>ul>li:nth-of-type(1)"
                  );
                  let followButton = $(document).find(
                    "div.h-action>span.h-follow"
                  );
                  blackOperationLi.off("click");
                  followButton.off("click");
                  blackOperationLi.on({
                    click: removeFromBlackListClickHandler,
                  });
                  followButton.on({
                    click: removeFromBlackListClickHandler,
                  });
                  blockReason.addReason(mid, url, "barrage", content);
                  showMDCSnackbar("添加拉黑理由完成");
                } else {
                  showMDCSnackbar(resultObj.message);
                }
              },
            });
          },
        });
      }, 0);
    });
    function removeFromBlackListClickHandler() {
      $(document).one({
        relationModifyXHRResponse: (event, resultObj) => {
          //   console.log(resultObj);
          if (resultObj.code === 0) {
            let blackOperationLi = $(document).find(
              "div.h-action>div.h-add-to-black>ul>li:nth-of-type(1)"
            );
            let followButton = $(document).find("div.h-action>span.h-follow");
            blackOperationLi.off("click");
            followButton.off("click");
            blackOperationLi.on({
              click: addToBlackListClickHandler,
            });
            blockReason.removeReason(mid);
            showMDCSnackbar("删除拉黑理由完成");
          } else {
            showMDCSnackbar(resultObj.message);
          }
        },
      });
    }

    function addToBlackListClickHandler() {
      //   console.log("addToBlackListClickHandler");
      // mdui.alert("sdfsdfsdf")
      $("#blackUrlInput").val(document.referrer);
      MDCDialog.open();
      //   console.log("addToBlackListClickHandlerEnd");
      //   let url = prompt("请输入网址", document.referrer);
      //   let content = prompt("请输入原因");
      //   let mid = midFromSpaceUrlRegEx.exec(window.location.href)[0];
      //   console.log("mid");
      //   console.log(mid);
      //   console.log("url");
      //   console.log(url);
      //   console.log("type");
      //   console.log("barrage");
      //   console.log("content");
      //   console.log(content);
      //   blockReason.addReason(mid, url, "barrage", content);
    }
  }
  if (blackListRegEx.test(window.location.href)) {
    onManagePage();
  } else if (spaceRegEx.test(window.location.href)) {
    onSpacePage();
  } else {
    onVideoPage();
  }
})();
