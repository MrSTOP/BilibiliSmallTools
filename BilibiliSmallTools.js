// ==UserScript==
// @name               哔哩哔哩 小功能
// @namespace          https://github.com/MrSTOP
// @version            0.6.0.1
// @description        记录为什么屏蔽了此人，支持导入导出。添加自动跳过充电页面功能，调整B站恶心的自动连播功能
// @author             MrSTOP
// @license            GPLv3
// @run-at             document-start
// @match              https://account.bilibili.com/account/*
// @match              https://www.bilibili.com/bangumi/*
// @match              https://www.bilibili.com/video/*
// @match              https://space.bilibili.com/*
// @match              https://www.bilibili.com/medialist/play/watchlater/*
// @match              https://www.bilibili.com/read/*
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_addValueChangeListener
// @grant              GM_removeValueChangeListener
// @grant              GM_addStyle
// @grant              GM_getResourceText
// @grant              GM_registerMenuCommand
// @require            https://cdn.jsdelivr.net/npm/jquery/dist/jquery.min.js
// @require            https://unpkg.com/material-components-web@11.0.0/dist/material-components-web.min.js
// @resource           material-component-web    https://unpkg.com/material-components-web@11.0.0/dist/material-components-web.min.css
// @noframes
// ==/UserScript==

// 监听XHR请求避免重复请求黑名单导致API被禁用
(function (open) {
  XMLHttpRequest.prototype.open = function () {
    this.addEventListener("readystatechange", function () {
      //   console.log("readystatechange" + this.readyState);
      if (this.readyState === 4) {
        // console.log(this.responseURL);
        // console.log(this.responseText);
        if (this.responseURL.includes("https://api.bilibili.com/x/relation/blacks")) {
          // 延迟一下避免黑名单列表没加载好
          setTimeout(() => {
            $(document).trigger("relationBlacksXHRResponse", [JSON.parse(this.responseText)]);
          }, 500);
        } else if (this.responseURL.includes("https://api.bilibili.com/x/relation/modify")) {
          // setTimeout(() => {
          $(document).trigger("relationModifyXHRResponse", [JSON.parse(this.responseText)]);
          // }, 500);
        } else if (this.responseURL.includes("https://api.bilibili.com/x/player/pagelist")) {
          $(document).trigger("playerPageListXHRResponse", [JSON.parse(this.responseText)]);
        } else if (this.responseURL.includes("https://api.bilibili.com/x/player/v2")) {
          $(document).trigger("playerV2XHRResponse", [JSON.parse(this.responseText)]);
        } else if (this.responseURL.includes("https://api.bilibili.com/x/space/acc/info")) {
          $(document).trigger("spaceAccInfoXHRResponse", [JSON.parse(this.responseText)]);
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

let SingletonData = (() => {
  let names = new Set();
  class SingletonData {
    constructor(key, defaultValue = null) {
      if (typeof key !== "string") throw "key must be string";
      if (!key) throw "key cannot be empty";
      if (names.has(key)) throw `SingletonData <${key}> is created.`;
      names.add(key);

      const unset = {};
      let data = unset;
      let isDisposed = false;

      function ensureSafe() {
        if (isDisposed) throw "object is disposed.";
      }

      Object.defineProperty(this, "data", {
        get: () => {
          ensureSafe();
          if (data === unset) {
            data = GM_getValue(key, defaultValue);
          }
          return data;
        },
        set: (value) => {
          ensureSafe();
          data = value;
          GM_setValue(key, value);
        },
      });

      this.save = () => {
        ensureSafe();
        GM_setValue(key, data);
      };

      const listenerId = GM_addValueChangeListener(key, (_, oldValue, newValue, remote) => {
        if (!remote) return;
        data = newValue;
      });
      this.dispose = () => {
        isDisposed = true;
        GM_removeValueChangeListener(listenerId);
        names.delete(key);
      };
    }
  }

  return SingletonData;
})();

(function () {
  "use strict";

  let MDCSnackbar = null;
  let jQ_MDCSnackbar = null;
  let MDCDialog = null;
  let DEFAULT_SETTING = {
    skipCharge: true,
    autoPlayChange: true,
    singleVideoAutoPlayRecommend: false,
    multipartVideoAutoPlay: true,
    multipartVideoAutoPlayRecommend: false,
    watchLaterAutoPlay: true,
    bangumiAutoPlay: true,
    settingButtonOpacity: 100,
    settingButtonRightPosition: 0,
    settingButtonTopPosition: 300,
    showSettingButton: true,
  };
  // let uid = document.cookie.match(/(?<=DedeUserID=).+?(?=;)/)[0];
  let crsfToken = document.cookie.match(/(?<=bili_jct=).+?(?=;)/)[0];

  function xmlEscape(s) {
    return $("<div/>").text(s).html();
  }

  GM_addStyle(GM_getResourceText("material-component-web"));
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
            [`共导入 ${added + errors + exists} 项,`, `新增 ${added}项, 存在 ${exists}项, 错误 ${errors}项.`].join(
              "<br>"
            )
          );
          return;
        }
      }
      showMDCSnackbar(`没有项目被导入.`);
    }
  }
  class SettingsStorage {
    constructor() {
      this._singletonData = new SingletonData("bilibili-small-tools-settings", DEFAULT_SETTING);
    }

    saveSettings(newSettings) {
      this._singletonData.data = newSettings;
      this._singletonData.save();
    }

    loadSettings() {
      return this._singletonData.data;
    }
  }

  let blockReasonController = new BlockController();
  let settingsStorage = new SettingsStorage();
  let currentSettings = settingsStorage.loadSettings();
  /********************************************************************************/
  //防止升级后出现undefined值
  if (currentSettings.watchLaterAutoPlay === undefined) {
    currentSettings.watchLaterAutoPlay = DEFAULT_SETTING.watchLaterAutoPlay;
  }
  if (currentSettings.bangumiAutoPlay === undefined) {
    currentSettings.bangumiAutoPlay = DEFAULT_SETTING.bangumiAutoPlay;
  }
  if (currentSettings.settingButtonOpacity === undefined) {
    currentSettings.settingButtonOpacity = DEFAULT_SETTING.settingButtonOpacity;
  }
  if (currentSettings.settingButtonRightPosition === undefined) {
    currentSettings.settingButtonRightPosition = DEFAULT_SETTING.settingButtonRightPosition;
  }
  if (currentSettings.settingButtonTopPosition === undefined) {
    currentSettings.settingButtonTopPosition = DEFAULT_SETTING.settingButtonTopPosition;
  }
  if (currentSettings.showSettingButton === undefined) {
    currentSettings.showSettingButton = DEFAULT_SETTING.showSettingButton;
  }
  /********************************************************************************/
  GM_addStyle(
    ".mdc-list-item{height:32px;padding:20px 0px 0px 14px}.mdc-list-item__text{padding-left:10px}" +
      ".bilibili-small-tools-setting{z-index:1001;position:absolute;right:" +
      currentSettings.settingButtonRightPosition / 10 +
      "%;top:" +
      currentSettings.settingButtonTopPosition / 10 +
      "%}" +
      ".bilibili-small-tools-setting-button{opacity:" +
      currentSettings.settingButtonOpacity / 1000 +
      "}" +
      ".bilibili-small-tools-setting-button:hover{opacity:1}"
  );
  let personalCenterRegEx = /https\:\/\/account\.bilibili\.com\/account\/.+/;
  let spaceRegEx = /https:\/\/space\.bilibili\.com\/[0-9]+/;
  let watchLaterRegEx = /https\:\/\/www\.bilibili\.com\/medialist\/play\/watchlater\/.+/;
  let bangumiRegEx = /https\:\/\/www\.bilibili\.com\/bangumi\/.+/;
  let articleRegEx = /https\:\/\/www\.bilibili\.com\/read\/.+/;
  let midFromSpaceUrlRegEx = /[0-9]+/;

  function injectMDCSnackbar() {
    if (MDCSnackbar !== null) {
      console.log("MDCSnackbar已注入，无需再次注入");
      return;
    }
    $("body").prepend(
      `<div id="MDCSnackbar" class="mdc-snackbar" style="top: 0;bottom: inherit;z-index: 10001">
        <div class="mdc-snackbar__surface" role="status" aria-relevant="additions">
          <div class="mdc-snackbar__label" aria-atomic="false"></div>
          <div class="mdc-snackbar__actions" aria-atomic="true"></div>
        </div>
      </div>`
    );
    //JQuery prepend不太稳定，等待JQuery注入完成
    // setTimeout(() => {
    jQ_MDCSnackbar = $("#MDCSnackbar");
    MDCSnackbar = mdc.snackbar.MDCSnackbar.attachTo(jQ_MDCSnackbar[0]);
    console.log("MDCSnackbar注入完成");
    // }, 0);
  }

  function showMDCSnackbar(info) {
    MDCSnackbar.close();
    $(jQ_MDCSnackbar).find(".mdc-snackbar__label").html(info);
    MDCSnackbar.open();
  }

  function injectSettingButton() {
    $("body").prepend(
      `<div class="bilibili-small-tools-setting" id="OpenSettingDialogButtonWrapper">
        <button id="OpenSettingDialogButton" class="mdc-icon-button bilibili-small-tools-setting-button" data-tooltip-id="AutoPlaySettingButtonTooltip" aria-label="toggle favorite" data-tooltip-id="tooltip-id">
          <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><path d="M0,0h24v24H0V0z" fill="none"/><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></g></svg>
        </button>
        <div id="AutoPlaySettingButtonTooltip" class="mdc-tooltip" role="tooltip"  data-mdc-tooltip-persist="false" aria-hidden="true">
        <div class= "mdc-tooltip__surface">自动播放设置</div>
        </div>
        </div>`
    );
    setTimeout(() => {
      let tooltip = mdc.tooltip.MDCTooltip.attachTo($("#AutoPlaySettingButtonTooltip")[0]);
      $("#OpenSettingDialogButton").on({
        click: () => {
          injectSettingDialog(true);
        },
        mouseenter: () => {
          $("#AutoPlaySettingButtonTooltip").show();
        },
        mouseleave: () => {
          $("#AutoPlaySettingButtonTooltip").hide();
        },
      });

      console.log("设置按钮注入完成");
    }, 0);
  }

  function injectSettingDialog(openAfterInject) {
    if (MDCDialog !== null) {
      console.log("设置MDCDialog已注入，无需再次注入");
    } else {
      $("body").prepend(
        `
    <div id="AutoPlaySettingDialog" class="mdc-dialog" style="z-index: 1001">
        <div class="mdc-dialog__container">
            <div class="mdc-dialog__surface" role="alertdialog" aria-modal="true"
                aria-labelledby="AutoPlaySettingDialogTitle" aria-describedby="my-dialog-content">
                <h2 class="mdc-dialog__title" id="AutoPlaySettingDialogTitle">自动播放设置</h2>

                <div class="mdc-dialog__content" id="">
                    <ul id="AutoPlaySettingOptionList" class="mdc-list" role="group"
                        aria-label="bilibili small tools setting">
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingSkipCharge" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingSkipChargeInput"
                                                class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text" for="SettingSkipChargeInput">是否自动跳过充电界面</label>
                        </li>
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingAutoPlayChange" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingAutoPlayChangeInput"
                                                class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text"
                                for="SettingAutoPlayChangeInput">是否启用自动连播改变功能(注意以下四项设置仅在启用本设置后生效)</label>
                        </li>
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingSingleVideoAutoPlayRecommend" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingSingleVideoAutoPlayRecommendInput"
                                                class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text"
                                for="SettingSingleVideoAutoPlayRecommendInput">单个视频是否启用自动连播</label>
                        </li>
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingMultipartVideoAutoPlay" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingMultipartVideoAutoPlayInput"
                                                class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text"
                                for="SettingMultipartVideoAutoPlayInput">多P视频是否启用分P自动连播</label>
                        </li>
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingMultipartVideoAutoPlayRecommend" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingMultipartVideoAutoPlayRecommendInput"
                                                class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text"
                                for="SettingMultipartVideoAutoPlayRecommendInput">多P视频是否启用推荐自动连播</label>
                        </li>
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingWatchLaterAutoPlay" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingWatchLaterAutoPlayInput"
                                                class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text"
                                for="SettingWatchLaterAutoPlayInput">稍后再看是否启用自动连播</label>
                        </li>
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingBangumiAutoPlay" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingBangumiAutoPlayInput"
                                                class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text" for="SettingBangumiAutoPlayInput">番剧是否启用自动切集</label>
                        </li>
                        <li>
                            <label class="mdc-list-item__text" for="SettingSettingButtonOpacity">设置按钮不透明度<input
                                    type="number" id="SettingSettingButtonOpacityManualInput" pattern="\d+" /></label>

                            <div class="mdc-slider" id="SettingSettingButtonOpacity">
                                <input class="mdc-slider__input" type="range" id="SettingSettingButtonOpacityInput"
                                    min="0" max="1000" value="100" name="buttonOpacity">
                                <div class="mdc-slider__track">
                                    <div class="mdc-slider__track--inactive"></div>
                                    <div class="mdc-slider__track--active">
                                        <div class="mdc-slider__track--active_fill"></div>
                                    </div>
                                </div>
                                <div class="mdc-slider__thumb">
                                    <div class="mdc-slider__thumb-knob"></div>
                                </div>
                            </div>
                        </li>
                        <li>
                            <label class="mdc-list-item__text" for="SettingSettingButtonRightPosition">设置按钮右侧偏移<input
                                    type="number" id="SettingSettingButtonRightPositionManualInput"
                                    pattern="\d+" /></label>

                            <div class="mdc-slider" id="SettingSettingButtonRightPosition">
                                <input class="mdc-slider__input" type="range"
                                    id="SettingSettingButtonRightPositionInput" min="0" max="1000" value="5"
                                    name="buttonRightPosition">
                                <div class="mdc-slider__track">
                                    <div class="mdc-slider__track--inactive"></div>
                                    <div class="mdc-slider__track--active">
                                        <div class="mdc-slider__track--active_fill"></div>
                                    </div>
                                </div>
                                <div class="mdc-slider__thumb">
                                    <div class="mdc-slider__thumb-knob"></div>
                                </div>
                            </div>
                        </li>
                        <li>
                            <label class="mdc-list-item__text" for="SettingSettingButtonTopPosition">设置按钮顶部偏移<input
                                    type="number" id="SettingSettingButtonTopPositionManualInput"
                                    pattern="\d+" /></label>

                            <div class="mdc-slider" id="SettingSettingButtonTopPosition">
                                <input class="mdc-slider__input" type="range" id="SettingSettingButtonTopPositionInput"
                                    min="0" max="1000" value="300" name="buttonTopPosition">
                                <div class="mdc-slider__track">
                                    <div class="mdc-slider__track--inactive"></div>
                                    <div class="mdc-slider__track--active">
                                        <div class="mdc-slider__track--active_fill"></div>
                                    </div>
                                </div>
                                <div class="mdc-slider__thumb">
                                    <div class="mdc-slider__thumb-knob"></div>
                                </div>
                            </div>
                        </li>
                        <li class="mdc-list-item" role="switch">
                            <span class="mdc-list-item__graphic">
                                <div id="SettingShowSettingButton" class="mdc-switch">
                                    <div class="mdc-switch__track"></div>
                                    <div class="mdc-switch__thumb-underlay">
                                        <div class="mdc-switch__thumb">
                                            <input type="checkbox" id="SettingShowSettingButtonInput" class="mdc-switch__native-control">
                                        </div>
                                    </div>
                                </div>
                            </span>
                            <label class="mdc-list-item__text" for="SettingBangumiAutoPlayInput">是否在页面上显示设置按钮</label>
                        </li>
                    </ul>
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
    </div>`
      );
      // setTimeout(() => {
      MDCDialog = mdc.dialog.MDCDialog.attachTo($("#AutoPlaySettingDialog")[0]);
      let settingList = mdc.list.MDCList.attachTo($("#AutoPlaySettingOptionList")[0]);

      let jQ_SkipChargeSwitch = $("#SettingSkipCharge");
      let jQ_AutoPlayChangeSwitch = $("#SettingAutoPlayChange");
      let jQ_SingleVideoAutoPlayRecommendSwitch = $("#SettingSingleVideoAutoPlayRecommend");
      let jQ_MultipartVideoAutoPlaySwitch = $("#SettingMultipartVideoAutoPlay");
      let jQ_MultipartVideoAutoPlayRecommendSwitch = $("#SettingMultipartVideoAutoPlayRecommend");
      let jQ_BangumiAutoPlaySwitch = $("#SettingBangumiAutoPlay");
      let jQ_WatchLaterAutoPlaySwitch = $("#SettingWatchLaterAutoPlay");
      let jQ_SettingButtonOpacitySlider = $("#SettingSettingButtonOpacity");
      let jQ_SettingButtonOpacityManualInput = $("#SettingSettingButtonOpacityManualInput");
      let jQ_SettingButtonRightPositionSlider = $("#SettingSettingButtonRightPosition");
      let jQ_SettingButtonRightPositionManualInput = $("#SettingSettingButtonRightPositionManualInput");
      let jQ_SettingButtonTopPositionSlider = $("#SettingSettingButtonTopPosition");
      let jQ_SettingButtonTopPositionManualInput = $("#SettingSettingButtonTopPositionManualInput");
      let jQ_ShowSettingButtonSwitch = $("#SettingShowSettingButton");

      let skipChargeSwitch = mdc.switchControl.MDCSwitch.attachTo(jQ_SkipChargeSwitch[0]);
      let autoPlayChangeSwitch = mdc.switchControl.MDCSwitch.attachTo(jQ_AutoPlayChangeSwitch[0]);
      let singleVideoAutoPlayRecommendSwitch = mdc.switchControl.MDCSwitch.attachTo(
        jQ_SingleVideoAutoPlayRecommendSwitch[0]
      );
      let multipartVideoAutoPlaySwitch = mdc.switchControl.MDCSwitch.attachTo(jQ_MultipartVideoAutoPlaySwitch[0]);
      let multipartVideoAutoPlayRecommendSwitch = mdc.switchControl.MDCSwitch.attachTo(
        jQ_MultipartVideoAutoPlayRecommendSwitch[0]
      );
      let bangumiAutoPlaySwitch = mdc.switchControl.MDCSwitch.attachTo(jQ_BangumiAutoPlaySwitch[0]);
      let watchLaterAutoPlaySwitch = mdc.switchControl.MDCSwitch.attachTo(jQ_WatchLaterAutoPlaySwitch[0]);
      let settingButtonOpacitySlider = mdc.slider.MDCSlider.attachTo(jQ_SettingButtonOpacitySlider[0]);
      let settingButtonRightPositionSlider = mdc.slider.MDCSlider.attachTo(jQ_SettingButtonRightPositionSlider[0]);
      let settingButtonTopPositionSlider = mdc.slider.MDCSlider.attachTo(jQ_SettingButtonTopPositionSlider[0]);
      let showSettingButtonSwitch = mdc.switchControl.MDCSwitch.attachTo(jQ_ShowSettingButtonSwitch[0]);

      MDCDialog.listen("MDCDialog:opened", () => {
        settingButtonOpacitySlider.layout();
        settingButtonRightPositionSlider.layout();
        settingButtonTopPositionSlider.layout();
      });

      settingButtonOpacitySlider.listen("MDCSlider:input", (event) => {
        jQ_SettingButtonOpacityManualInput.val(event.detail.value);
        $("#OpenSettingDialogButton").css("opacity", event.detail.value / 1000);
      });
      jQ_SettingButtonOpacityManualInput.on({
        input: () => {
          let opacityValue = jQ_SettingButtonOpacityManualInput.val();
          opacityValue = opacityValue < 0 ? 0 : opacityValue;
          opacityValue = opacityValue > 1000 ? 1000 : opacityValue;
          jQ_SettingButtonOpacityManualInput.val(opacityValue);
          settingButtonOpacitySlider.setValue(opacityValue);
          $("#OpenSettingDialogButton").css("opacity", opacityValue / 1000);
        },
      });
      settingButtonRightPositionSlider.listen("MDCSlider:input", (event) => {
        jQ_SettingButtonRightPositionManualInput.val(event.detail.value);
        $("#OpenSettingDialogButtonWrapper").css("right", event.detail.value / 10 + "%");
      });
      jQ_SettingButtonRightPositionManualInput.on({
        input: () => {
          let rightPositionValue = jQ_SettingButtonRightPositionManualInput.val();
          rightPositionValue = rightPositionValue < 0 ? 0 : rightPositionValue;
          rightPositionValue = rightPositionValue > 1000 ? 1000 : rightPositionValue;
          jQ_SettingButtonRightPositionManualInput.val(rightPositionValue);
          settingButtonRightPositionSlider.setValue(rightPositionValue);
          $("#OpenSettingDialogButtonWrapper").css("right", rightPositionValue / 10 + "%");
        },
      });
      settingButtonTopPositionSlider.listen("MDCSlider:input", (event) => {
        jQ_SettingButtonTopPositionManualInput.val(event.detail.value);
        $("#OpenSettingDialogButtonWrapper").css("top", event.detail.value / 10 + "%");
      });
      jQ_SettingButtonTopPositionManualInput.on({
        input: () => {
          let topPositionValue = jQ_SettingButtonTopPositionManualInput.val();
          topPositionValue = topPositionValue < 0 ? 0 : topPositionValue;
          topPositionValue = topPositionValue > 1000 ? 1000 : topPositionValue;
          jQ_SettingButtonTopPositionManualInput.val(topPositionValue);
          settingButtonTopPositionSlider.setValue(topPositionValue);
          $("#OpenSettingDialogButtonWrapper").css("top", topPositionValue / 10 + "%");
        },
      });

      jQ_AutoPlayChangeSwitch.on({
        change: () => {
          if (autoPlayChangeSwitch.checked) {
            settingList.setEnabled([2], true);
            singleVideoAutoPlayRecommendSwitch.disabled = false;
            settingList.setEnabled([3], true);
            multipartVideoAutoPlaySwitch.disabled = false;
            settingList.setEnabled([4], true);
            multipartVideoAutoPlayRecommendSwitch.disabled = false;
            settingList.setEnabled([5], true);
            watchLaterAutoPlaySwitch.disabled = false;
            settingList.setEnabled([6], true);
            bangumiAutoPlaySwitch.disabled = false;
          } else {
            settingList.setEnabled([2], false);
            singleVideoAutoPlayRecommendSwitch.disabled = true;
            settingList.setEnabled([3], false);
            multipartVideoAutoPlaySwitch.disabled = true;
            settingList.setEnabled([4], false);
            multipartVideoAutoPlayRecommendSwitch.disabled = true;
            settingList.setEnabled([5], false);
            watchLaterAutoPlaySwitch.disabled = true;
            settingList.setEnabled([6], false);
            bangumiAutoPlaySwitch.disabled = true;
          }
        },
      });

      skipChargeSwitch.checked = currentSettings.skipCharge;
      autoPlayChangeSwitch.checked = currentSettings.autoPlayChange;
      singleVideoAutoPlayRecommendSwitch.checked = currentSettings.singleVideoAutoPlayRecommend;
      multipartVideoAutoPlaySwitch.checked = currentSettings.multipartVideoAutoPlay;
      multipartVideoAutoPlayRecommendSwitch.checked = currentSettings.multipartVideoAutoPlayRecommend;
      watchLaterAutoPlaySwitch.checked = currentSettings.watchLaterAutoPlay;
      bangumiAutoPlaySwitch.checked = currentSettings.bangumiAutoPlay;
      let settingButtonOpacity = currentSettings.settingButtonOpacity;
      settingButtonOpacitySlider.setValue(settingButtonOpacity);
      jQ_SettingButtonOpacityManualInput.val(settingButtonOpacity);
      let settingButtonRightPosition = currentSettings.settingButtonRightPosition;
      settingButtonRightPositionSlider.setValue(settingButtonRightPosition);
      jQ_SettingButtonRightPositionManualInput.val(settingButtonRightPosition);
      let settingButtonTopPosition = currentSettings.settingButtonTopPosition;
      settingButtonTopPositionSlider.setValue(settingButtonTopPosition);
      jQ_SettingButtonTopPositionManualInput.val(settingButtonTopPosition);
      showSettingButtonSwitch.checked = currentSettings.showSettingButton;

      $("#SettingDialogCancelButton").on({
        click: () => {
          MDCDialog.close();
        },
      });
      $("#SettingDialogConfirmButton").on({
        click: () => {
          currentSettings.skipCharge = skipChargeSwitch.checked;
          currentSettings.autoPlayChange = autoPlayChangeSwitch.checked;
          currentSettings.singleVideoAutoPlayRecommend = singleVideoAutoPlayRecommendSwitch.checked;
          currentSettings.multipartVideoAutoPlay = multipartVideoAutoPlaySwitch.checked;
          currentSettings.multipartVideoAutoPlayRecommend = multipartVideoAutoPlayRecommendSwitch.checked;
          currentSettings.watchLaterAutoPlay = watchLaterAutoPlaySwitch.checked;
          currentSettings.bangumiAutoPlay = bangumiAutoPlaySwitch.checked;
          currentSettings.settingButtonOpacity = settingButtonOpacitySlider.getValue();
          currentSettings.settingButtonRightPosition = settingButtonRightPositionSlider.getValue();
          currentSettings.settingButtonTopPosition = settingButtonTopPositionSlider.getValue();
          currentSettings.showSettingButton = showSettingButtonSwitch.checked;
          settingsStorage.saveSettings(currentSettings);
          showMDCSnackbar("设置保存成功");
          MDCDialog.close();
        },
      });

      showMDCSnackbar("设置加载成功");
      console.log("设置MDCDialog注入完成");
      // }, 0);
    }
    if (openAfterInject) {
      MDCDialog.open();
    }
  }

  function injectBlackReasonDialog(openAfterInject) {
    if (MDCDialog !== null) {
      console.log("拉黑原因MDCDialog已注入，无需再次注入");
    } else {
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
            <div id="blackReasonDialogActions" class="mdc-dialog__actions"></div>
          </div>
        </div>
        <div class="mdc-dialog__scrim"></div>
      </div>`
      );
      //JQuery prepend不太稳定，等待JQuery注入完成
      // setTimeout(() => {
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
      // }, 0);
      console.log("拉黑原因MDCDialog注入完成");
    }
    if (openAfterInject) {
      MDCDialog.open();
    }
  }

  let VIDEO_PAGE_PLAY_LIST_OBJ;
  function onVideoPage() {
    GM_registerMenuCommand("设置", () => {
      injectSettingDialog(true);
    });
    let observer = new MutationObserver((mutationRecords, instance) => {
      mutationRecords.forEach((mutationRecord) => {
        //没有添加节点
        if (mutationRecord.addedNodes.length === 0) {
          return;
        }
        if ($(".bilibili-player-electric-panel-jump-content").length !== 0 && currentSettings.skipCharge) {
          //console.log(mutationRecord);
          $(".bilibili-player-electric-panel-jump-content")[0].click();
          console.log("跳过充电");
        }
        mutationRecord.addedNodes.forEach((node) => {
          if ($(node).hasClass("bilibili-player-video-btn-setting") && currentSettings.autoPlayChange) {
            if (bangumiRegEx.test(window.location.href)) {
              console.log("处于番剧页面");
              $("body .bilibili-player-video-btn-setting")[0].dispatchEvent(new Event("mouseover"));
              $("body .bilibili-player-video-btn-setting")[0].dispatchEvent(new Event("mouseout"));
              if (currentSettings.bangumiAutoPlay) {
                $(
                  "body .bilibili-player-video-btn-setting-right-playtype-content>div>div>label:nth-of-type(1)"
                )[0].click();
                console.log("已开启自动切集");
              } else {
                $(
                  "body .bilibili-player-video-btn-setting-right-playtype-content>div>div>label:nth-of-type(2)"
                )[0].click();
                console.log("已开启播完暂停");
              }
            }
          }
          if ($(node).hasClass("list-item") || $(node).hasClass("reply-item")) {
            // console.log($(node));
            let blackButtons = $(node).find(
              "div.con>div.info>div.operation>div.opera-list>ul>li.blacklist,div.info>div.operation>div.opera-list>ul>li.blacklist"
            );
            // console.log(blackButton);
            blackButtons.on({
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
      injectMDCSnackbar();
      if (currentSettings.showSettingButton) {
        injectSettingButton();
      } else {
        console.log("无需注入设置按钮");
      }
    });

    $(document).on({
      playerPageListXHRResponse: (event, playlistObj) => {
        if (!currentSettings.autoPlayChange) {
          console.log("无需改变自动播放状态");
          return;
        }
        if (watchLaterRegEx.test(window.location.href)) {
          console.log("处于稍后再看页面");
          let watchLaterListObserver = new MutationObserver((mutationRecords, instance) => {
            mutationRecords.forEach((mutationRecord) => {
              //没有添加节点
              if (mutationRecord.addedNodes.length === 0) {
                return;
              }
              mutationRecord.addedNodes.forEach((node) => {
                if ($(node).hasClass("player-auxiliary-area")) {
                  let autoPlayButton = $(node).find(".player-auxiliary-autoplay-switch>.bui-switch-input");
                  if (!autoPlayButton.prop("checked")) {
                    console.log("自动连播处于关闭状态");
                    if (currentSettings.watchLaterAutoPlay) {
                      autoPlayButton.click();
                      console.log("已开启自动连播");
                    }
                  } else {
                    console.log("自动连播处于开启状态");
                    if (!currentSettings.watchLaterAutoPlay) {
                      autoPlayButton.click();
                      console.log("已关闭自动连播");
                    }
                  }
                  watchLaterListObserver.disconnect();
                }
              });
            });
          });
          watchLaterListObserver.observe(document, {
            childList: true,
            subtree: true,
          });
        } else {
          VIDEO_PAGE_PLAY_LIST_OBJ = playlistObj;
          if (playlistObj.data.length === 1) {
            let autoPlayButton = $("#reco_list").find(".next-play .next-button .switch-button");
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
            let autoPlayButton = $("#multi_page").find(".next-button .switch-button");
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
        }
      },
      playerV2XHRResponse: (event, v2Obj) => {
        if (!currentSettings.autoPlayChange) {
          console.log("无需改变自动播放状态");
          return;
        }
        if ($("#multi_page").length === 0) {
          return;
        }
        if (v2Obj.data.cid === VIDEO_PAGE_PLAY_LIST_OBJ.data[VIDEO_PAGE_PLAY_LIST_OBJ.data.length - 1].cid) {
          console.log("分P视频最后一P");
          let autoPlayButton = $("#multi_page").find(".next-button .switch-button");
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
              blockReasonController.addReason(
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
        let importButton = mdc.ripple.MDCRipple.attachTo($("#ImportDataButton")[0]);
        let exportButton = mdc.ripple.MDCRipple.attachTo($("#ExportDataButton")[0]);

        $("#ImportFileInput").on({
          change: (e) => {
            let file = e.target.files[0];
            if (!file) {
              return;
            }
            let reader = new FileReader();
            reader.onload = (x) => {
              var contents = x.target.result;
              blockReasonController.import2(contents);
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
            blockReasonController.export();
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
      injectMDCSnackbar();
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
          <div class="mdc-dialog__scrim"></div></div>`
      );
      //JQuery prepend不太稳定，等待JQuery注入完成
      // setTimeout(() => {
      MDCDialog = mdc.dialog.MDCDialog.attachTo($(".mdc-dialog")[0]);
      $("#blackReasonDialogConfirmButton").on({
        click: function () {
          MDCDialog.close();
        },
      });
      // }, 0);
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
                    $(this).parentsUntil(".black-list").parent().find("span.black-btn").attr("mid"),
                  "_blank"
                );
              },
            });
            let data = blockReasonController.getReason(blackListObj.data.list[index].mid);
            removeBtn.on({
              click: () => {
                $(document).one({
                  relationModifyXHRResponse: (event, resultObj) => {
                    // console.log(resultObj);
                    if (resultObj.code === 0) {
                      blockReasonController.removeReason($(element).attr("mid"));
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

              if (data.url !== undefined && data.url !== null && data.url !== "") {
                let url = document.createElement("a");
                url.href = data.url;
                url.innerHTML = "此页面";
                url.target = "_blank";
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
                  let reason = blockReasonController.getReason(
                    $(this).parentsUntil(".black-list").parent().find("span.black-btn").attr("mid")
                  );
                  if (reason === undefined || reason === null) {
                    showMDCSnackbar("没有找到拉黑原因，可能已被移除黑名单，请刷新页面");
                    return;
                  }
                  //   console.log(reason);
                  $("#blackReasonDialog").find("h2#blackReasonDialogTitle>a").html(decodeURIComponent(reason.url));
                  $("#blackReasonDialog").find("h2#blackReasonDialogTitle>a").attr("href", reason.url);
                  $("#blackReasonDialog").find("div#blackDetails").html(reason.content);
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
        //没有添加节点
        if (mutation.addedNodes.length === 0) {
          return;
        }
        mutation.addedNodes.forEach((node) => {
          let blackOperationLi = $(node).find("div.h-action>div.h-add-to-black>ul>li:nth-of-type(1)");
          let blackOperationUl = $(node).find("div.h-action>div.h-add-to-black>ul");
          let followButton = $(node).find("div.h-action>span.h-unfollow");
          if (blackOperationLi[0]) {
            if (blackOperationLi.html().includes("加入黑名单")) {
              blackOperationLi.on({
                click: addToBlackListClickHandler,
              });
              changeDialogAndBlackReasonButton(false);
            } else if (blackOperationLi.html().includes("移除黑名单")) {
              blackOperationLi.on({
                click: removeFromBlackListClickHandler,
              });
              followButton.on({
                click: removeFromBlackListClickHandler,
              });
              changeDialogAndBlackReasonButton(true);
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
      injectMDCSnackbar();
      injectBlackReasonDialog(false);
    });

    function changeDialogAndBlackReasonButton(userInBlackList) {
      if (userInBlackList) {
        $("#blackReasonDialogActions").html(`
          <button id="blackReasonDialogOkButton" type="button" class="mdc-button mdc-dialog__button">
          <div class="mdc-button__ripple"></div>
          <span class="mdc-button__label">确定</span>
          </button>`);
        let blackReasonButton = $("div.h-action>div.h-add-to-black>ul").append(
          `<li id="BlackReasonButton" class="be-dropdown-item">拉黑原因</li>`
        );
        blackReasonButton.on({
          click: () => {
            let blockReason = blockReasonController.getReason(mid);
            if (blockReason === undefined || blockReason === null) {
              showMDCSnackbar("没有找到拉黑原因信息，该用户已被移除黑名单或是在未使用脚本时拉黑的");
              return;
            }
            $("#blackUrlInput").val(blockReason.url);
            $("#blackReasonTextArea").val(blockReason.content);
            MDCDialog.open();
            $("#blackReasonTextArea").focus();
          },
        });
        $("#blackReasonDialogOkButton").on({
          click: function () {
            MDCDialog.close();
          },
        });
      } else {
        $("#blackReasonDialogActions").html(`
          <button id="blackReasonDialogCancelButton" type="button" class="mdc-button mdc-dialog__button">
          <div class="mdc-button__ripple"></div>
          <span class="mdc-button__label">取消</span>
          </button>
          <button id="blackReasonDialogConfirmButton" type="button" class="mdc-button mdc-dialog__button">
          <div class="mdc-button__ripple"></div>
          <span class="mdc-button__label">确定</span>
          </button>`);
        $("#BlackReasonButton").remove();
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
                  let blackOperationLi = $(document).find("div.h-action>div.h-add-to-black>ul>li:nth-of-type(1)");
                  let followButton = $(document).find("div.h-action>span.h-follow");
                  blackOperationLi.off("click");
                  followButton.off("click");
                  blackOperationLi.on({
                    click: removeFromBlackListClickHandler,
                  });
                  followButton.on({
                    click: removeFromBlackListClickHandler,
                  });
                  blockReasonController.addReason(mid, url, "barrage", content);
                  showMDCSnackbar("添加拉黑理由完成");
                  changeDialogAndBlackReasonButton(true);
                } else {
                  showMDCSnackbar(resultObj.message);
                }
              },
            });
          },
        });
      }
    }

    function removeFromBlackListClickHandler() {
      $(document).one({
        relationModifyXHRResponse: (event, resultObj) => {
          //   console.log(resultObj);
          if (resultObj.code === 0) {
            let blackOperationLi = $(document).find("div.h-action>div.h-add-to-black>ul>li:nth-of-type(1)");
            let followButton = $(document).find("div.h-action>span.h-follow");
            blackOperationLi.off("click");
            followButton.off("click");
            blackOperationLi.on({
              click: addToBlackListClickHandler,
            });
            blockReasonController.removeReason(mid);
            showMDCSnackbar("删除拉黑理由完成");
            changeDialogAndBlackReasonButton(false);
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

  function onArticlePage() {
    let observer = new MutationObserver((mutationRecords, instance) => {
      mutationRecords.forEach((mutationRecord) => {
        //没有添加节点
        if (mutationRecord.addedNodes.length === 0) {
          return;
        }
        mutationRecord.addedNodes.forEach((node) => {
          if ($(node).hasClass("list-item") || $(node).hasClass("reply-item")) {
            // console.log($(node));
            let blackButtons = $(node).find(
              "div.con>div.info>div.operation>div.opera-list>ul>li.blacklist,div.info>div.operation>div.opera-list>ul>li.blacklist"
            );
            // console.log(blackButton);
            blackButtons.on({
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
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
    });

    $("body").ready(() => {
      injectMDCSnackbar();
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
              blockReasonController.addReason(
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

  if (personalCenterRegEx.test(window.location.href)) {
    onManagePage();
  } else if (spaceRegEx.test(window.location.href)) {
    onSpacePage();
  } else if (articleRegEx.test(window.location.href)) {
    onArticlePage();
  } else {
    onVideoPage();
  }
})();
