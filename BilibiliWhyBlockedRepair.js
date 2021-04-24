// ==UserScript==
// @name:              哔哩哔哩 为什么拉黑 修复
// @namespace          https://github.com/MrSTOP
// @version            0.1.0.0
// @description:       记录为什么屏蔽了此人
// @author             MrSTOP
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
        if (
          this.responseURL.includes(
            "https://api.bilibili.com/x/relation/blacks"
          )
        ) {
          // 延迟一下避免黑名单列表没加载好
          setTimeout(() => {
            $(document).trigger("relationBlackXHRResponse", [
              JSON.parse(this.responseText),
            ]);
          }, 500);
        } else if (
          this.responseURL.includes(
            "https://api.bilibili.com/x/relation/modify"
          )
        ) {
          setTimeout(() => {
            $(document).trigger("relationModifyXHRResponse", [
              JSON.parse(this.responseText),
            ]);
          }, 500);
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

    async import2(content, snackbar, jqSnackbar) {
      let data = null;
      try {
        data = JSON.parse(content);
      } catch (_) {
        showSnackBar(snackbar, jqSnackbar, "这不是有效的JSON文件.");
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
              //   if (await this._ServerSiteBlockAsync(z.key)) {
              // this.addReason(z.key, z.url, z.type, z.content);
              // added++;
              //   } else {
              errors++;
              //   }
            } else {
              exists++;
            }
          }
        }

        if (added + errors + exists > 0) {
          showSnackBar(
            snackbar,
            jqSnackbar,
            [
              `共导入 ${added + errors + exists} 项,`,
              `新增 ${added}项, 存在 ${exists}项, 错误 ${errors}项.`,
            ].join("<br>")
          );
          return;
        }
      }
      showSnackBar(snackbar, jqSnackbar, `没有项目被导入.`);
    }
  }

  let blockReason = new BlockController();

  function xmlEscape(s) {
    return $("<div/>").text(s).html();
  }
  let blackListRegEx = /https\:\/\/account\.bilibili\.com\/account\/blacklist/;
  let spaceRegEx = /https:\/\/space\.bilibili\.com\/[0-9]+/;
  let midFromSpaceUrlRegEx = /[0-9]+/;

  function showSnackBar(snackbar, jqSnackbar, info) {
    snackbar.close();
    $(jqSnackbar).find(".mdc-snackbar__label").html(info);
    snackbar.open();
  }

  function onVideoPage() {
    $("body").prepend(
      '<div id="MDCSnackBar" class="mdc-snackbar" style="top: 0;bottom: inherit;z-index: 10001">' +
        '<div class="mdc-snackbar__surface" role="status" aria-relevant="additions">' +
        '<div class="mdc-snackbar__label" aria-atomic="false">Can\'t send photo.Retry in 5 seconds.</div>' +
        '<div class="mdc-snackbar__actions" aria-atomic="true">' +
        "</div>" +
        "</div>" +
        "</div>"
    );
    let snackbar = mdc.snackbar.MDCSnackbar.attachTo($("#MDCSnackBar")[0]);
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
        showSnackBar(snackbar, $("#MDCSnackBar"), "发生错误");
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
      showSnackBar(snackbar, $("#MDCSnackBar"), "用户评论信息解析完成");
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
              showSnackBar(
                snackbar,
                $("#MDCSnackBar"),
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
              showSnackBar(snackbar, $("#MDCSnackBar"), resultObj.message);
            }
          },
        });
      } else {
        showSnackBar(
          snackbar,
          $("#MDCSnackBar"),
          "添加拉黑理由失败</br>lastCommentUser为null"
        );
      }
    }
    let observer = new MutationObserver((mutationRecords, instance) => {
      mutationRecords.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // console.log(node.classList.contains("blacklist"));
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
  }

  function onManagePage() {
    $("body").prepend(
      '<div id="blackReasonDialog" class="mdc-dialog" style="z-index:20001" aria-modal="true">' +
        '<div class="mdc-dialog__container" style="width: 100%">' +
        '<div class="mdc-dialog__surface" style="width: 100%" role="alertdialog" aria-modal="true" aria-labelledby="my-dialog-title" aria-describedby="my-dialog-content">' +
        '<h2 class="mdc-dialog__title" id="blackTitle">' +
        '<a target="_blank" style="word-break: break-word"></a>' +
        "</h2>" +
        '<div class="mdc-dialog__content" id="blackDetails">' +
        "</div>" +
        '<div class="mdc-dialog__actions">' +
        '<button id="blackReasonDialogConfirmButton" type="button" class="mdc-button mdc-dialog__button">' +
        '<div class="mdc-button__ripple"></div>' +
        '<span class="mdc-button__label">确认</span>' +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="mdc-dialog__scrim"></div></div>' +
        '<div id="MDCSnackBar" class="mdc-snackbar" style="top: 0;bottom: inherit;z-index: 1001">' +
        '<div class="mdc-snackbar__surface" role="status" aria-relevant="additions">' +
        '<div class="mdc-snackbar__label" aria-atomic="false">Can\'t send photo.Retry in 5 seconds.</div>' +
        '<div class="mdc-snackbar__actions" aria-atomic="true">' +
        "</div>" +
        "</div>" +
        "</div>"
    );
    let dialog = mdc.dialog.MDCDialog.attachTo($(".mdc-dialog")[0]);
    let snackbar = mdc.snackbar.MDCSnackbar.attachTo($("#MDCSnackBar")[0]);
    // snackbar.open();
    $(document).on({
      relationBlackXHRResponse: function (event, blackListObj) {
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
                      showSnackBar(
                        snackbar,
                        $("#MDCSnackBar"),
                        "删除拉黑理由完成"
                      );
                    } else {
                      showSnackBar(
                        snackbar,
                        $("#MDCSnackBar"),
                        resultObj.message
                      );
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
                    .find("h2#blackTitle>a")
                    .html(decodeURIComponent(reason.url));
                  $("#blackReasonDialog")
                    .find("h2#blackTitle>a")
                    .attr("href", reason.url);
                  $("#blackReasonDialog")
                    .find("div#blackDetails")
                    .html(reason.content);
                  dialog.open();
                },
              });
            }
          });
        } else {
          alert(blackListObj.message);
        }
      },
    });
    $("#blackReasonDialogConfirmButton").on({
      click: function () {
        dialog.close();
      },
    });
    let observer = new MutationObserver((mutationsList, instance) => {
      let buttonDiv = $("#app>div>div>div>div.security-right-title");
      if (buttonDiv[0]) {
        buttonDiv.append(
          '<div style="float: right;padding: 7px">' +
            '<input id="ImportFileInput" type="file" hidden accept="application/json">' +
            '<button id="ImportDataButton" class="mdc-button mdc-button--outlined">' +
            '<span class="mdc-button__ripple"></span>' +
            '<span class="mdc-button__label">导入</span>' +
            "</button>" +
            '<span style="padding: 8px"></span>' +
            '<button id="ExportDataButton" class="mdc-button mdc-button--outlined">' +
            '<span class="mdc-button__ripple"></span>' +
            '<span class="mdc-button__label">导出</span>' +
            "</button>" +
            "</div>"
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
              blockReason.import2(contents, snackbar, $("#MDCSnackBar"));
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
            //     $("#MDCSnackBar"),
            //     "Cannot import because of API is invalid."
            //   );
            // }
          },
        });
        $("#ExportDataButton").on({
          click: () => {
            blockReason.export();
            showSnackBar(snackbar, $("#MDCSnackBar"), "导出完成");
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
  }

  function onSpacePage() {
    let mid = midFromSpaceUrlRegEx.exec(window.location.href)[0];
    if (mid === undefined || mid === null || mid === "") {
      alert("Mid get failed. Script will not work");
      return;
    }
    $("body").prepend(
      '<div id="blackReasonDialog" class="mdc-dialog" style="z-index:20001" aria-modal="true">' +
        '<div class="mdc-dialog__container" style="width: 100%">' +
        '<div class="mdc-dialog__surface" style="width: 100%" role="alertdialog" aria-modal="true" aria-labelledby="my-dialog-title" aria-describedby="my-dialog-content">' +
        '<div class="mdc-dialog__content">' +
        '<label class="mdc-text-field mdc-text-field--outlined"  style="width: 100%">' +
        '<span class="mdc-notched-outline">' +
        '<span class="mdc-notched-outline__leading"></span>' +
        '<span class="mdc-notched-outline__notch">' +
        '<span class="mdc-floating-label" id="my-label-id">Url</span>' +
        "</span>" +
        '<span class="mdc-notched-outline__trailing"></span>' +
        "</span>" +
        '<input id="blackUrlInput" type="text" class="mdc-text-field__input" aria-labelledby="my-label-id">' +
        "</label>" +
        "</br>" +
        "</br>" +
        '<label class="mdc-text-field mdc-text-field--outlined mdc-text-field--textarea" style="width: 100%">' +
        '<span class="mdc-notched-outline">' +
        '<span class="mdc-notched-outline__leading"></span>' +
        '<span class="mdc-notched-outline__notch">' +
        '<span class="mdc-floating-label" id="my-label-id">原因</span>' +
        "</span>" +
        '<span class="mdc-notched-outline__trailing"></span>' +
        "</span>" +
        '<span class= "mdc-text-field__resizer">' +
        '<textarea id="blackReasonTextArea" class="mdc-text-field__input" rows="8" aria-label="Label"></textarea> ' +
        "</span>" +
        "</label>" +
        "</div>" +
        '<div class="mdc-dialog__actions">' +
        '<button id="blackReasonDialogCancelButton" type="button" class="mdc-button mdc-dialog__button">' +
        '<div class="mdc-button__ripple"></div>' +
        '<span class="mdc-button__label">取消</span>' +
        "</button>" +
        '<button id="blackReasonDialogConfirmButton" type="button" class="mdc-button mdc-dialog__button">' +
        '<div class="mdc-button__ripple"></div>' +
        '<span class="mdc-button__label">确认</span>' +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="mdc-dialog__scrim"></div></div>' +
        '<div id="MDCSnackBar" class="mdc-snackbar" style="top: 0;bottom: inherit;z-index: 1001">' +
        '<div class="mdc-snackbar__surface" role="status" aria-relevant="additions">' +
        '<div class="mdc-snackbar__label" aria-atomic="false">Can\'t send photo.Retry in 5 seconds.</div>' +
        "</div>" +
        "</div>"
    );
    let snackbar = mdc.snackbar.MDCSnackbar.attachTo($("#MDCSnackBar")[0]);
    $(".mdc-text-field").each((index, element) => {
      mdc.textField.MDCTextField.attachTo($(element)[0]);
    });
    let dialog = mdc.dialog.MDCDialog.attachTo($(".mdc-dialog")[0]);
    // console.log(dialog.scrimClickAction);
    dialog.scrimClickAction = "";
    $("#blackReasonDialogCancelButton").on({
      click: function () {
        let blackConfirmDialog = $("body>div.modal-container");
        blackConfirmDialog.each((index, element) => {
          if ($(element).css("display") !== "none") {
            $(element).find("div>div>a.default")[0].click();
          }
        });
        dialog.close();
      },
    });
    $("#blackReasonDialogConfirmButton").on({
      click: function () {
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
            dialog.close();
          }
        });
        $(document).one({
          relationModifyXHRResponse: (event, resultObj) => {
            // console.log(resultObj);
            if (resultObj.code === 0) {
              let blackOperationLi = $(document).find(
                "div.h-action>div.h-add-to-black>ul>li:nth-of-type(1)"
              );
              let followButton = $(document).find("div.h-action>span.h-follow");
              blackOperationLi.off("click");
              followButton.off("click");
              blackOperationLi.on({
                click: removeFromBlackListClickHandler,
              });
              followButton.on({
                click: removeFromBlackListClickHandler,
              });
              blockReason.addReason(mid, url, "barrage", content);
              showSnackBar(snackbar, $("#MDCSnackBar"), "添加拉黑理由完成");
            } else {
              showSnackBar(snackbar, $("#MDCSnackBar"), resultObj.message);
            }
          },
        });
      },
    });
    function removeFromBlackListClickHandler() {
      $(document).one({
        relationModifyXHRResponse: (event, resultObj) => {
          //   console.log(resultObj);
          snackbar.close();
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
            $("#MDCSnackBar")
              .find(".mdc-snackbar__label")
              .html("删除拉黑理由完成");
            snackbar.open();
          } else {
            $("#MDCSnackBar")
              .find(".mdc-snackbar__label")
              .html(resultObj.message);
            snackbar.open();
          }
        },
      });
    }

    function addToBlackListClickHandler() {
      //   console.log("addToBlackListClickHandler");
      // mdui.alert("sdfsdfsdf")
      $("#blackUrlInput").val(document.referrer);
      dialog.open();
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
              alert("无法识别操作");
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
  }
  if (blackListRegEx.test(window.location.href)) {
    onManagePage();
  } else if (spaceRegEx.test(window.location.href)) {
    onSpacePage();
  } else {
    onVideoPage();
  }
})();
