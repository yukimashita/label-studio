// ==UserScript==
// @name         Label Studio入力支援
// @namespace    http://tampermonkey.net/
// @version      2024-05-27
// @description  try to take over the world!
// @author       hiroya@spir.co.jp
// @match        http://0.0.0.0:45547/*
// @match        http://localhost:45547/*
// @match        http://127.0.0.1:45547/*
// @resource     toastr.min.css https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js
// @require      https://malsup.github.io/jquery.blockUI.js
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==

(() => {
  'use strict';

  let selectCancelFlag = false;

  const toastrPositionClass = 'toastr-middle-center';
  GM_addStyle(GM_getResourceText('toastr.min.css'));
  GM_addStyle(`.${toastrPositionClass} { top: 50%; left: 50%; margin:0 0 0 -150px; }`);
  toastr.options.positionClass = toastrPositionClass;

  const isTaskPage = () => {
    const params = new URLSearchParams(location.search);
    return params.get('task');
  };

  const getRegions = () => {
    return unsafeWindow.LabelStudioHook.VideoRegions.regions.slice();
  };

  const setPosition = frame => {
    // ビデオの再生フレームの設定 (横軸)
    unsafeWindow.LabelStudioHook.HtxVideo.handleTimelinePositionChange(frame);
  };

  const setSelectedRegion = region => {
    // regionをタイムラインに表示する設定 (縦軸)
    const index = getRegions().findIndex(r => r.id === region.id);
    if (index !== -1)
      unsafeWindow.LabelStudioHook.Frames.setSelectedRegionIndex(index);
  };

  const setTimelineEntries = n => {
    // タイムラインに表示するリージョン数の設定
    if (n < 2)
      return;
    const t = document.getElementsByClassName('lsf-timeline-frames')[0];
    if (t)
      t.style.setProperty('--view-height', `${n*24}px`);
  };

  const setMinimapEntries = n => {
    // ミニマップに表示するリージョン数の設定
    if (n < 2)
      return;
    const s = document.getElementsByClassName('lsf-seeker')[0];
    if (!s)
      return;
    s.style.height = `${n*3}px`;
    unsafeWindow.LabelStudioHook.Minimap.setDisplayEntries(n);
  };

  //

  const getEvent = o => {
    const ev = {
      shiftKey: false,
      ctrlKey: false,
      metaKey: false
    };
    return Object.assign(ev, o);
  };

  const isSelectedRegion = r => r.selected || r.inSelection;
  const getSelectedRegion = () => getRegions().find(isSelectedRegion);

  const getNextRegion = (currentRegion, regions=getRegions()) => {
    if (!currentRegion) {
      console.error('>>> getNextRegion');
      console.error('!currentRegion');
      return null;
    }
    const i = regions
          .findIndex(r => r.id === currentRegion.id);
    if (i === -1) {
      console.error('>>> getNextRegion');
      console.error('i === -1');
      console.error(`regions.length: ${regions.length}`);
      console.error(regions);
      return null;
    }
    return regions[(i + 1) % regions.length];
  };

  const selectRegion = region => {
    if (!region || !region.hasOwnProperty('onClickRegion'))
      return;
    if (!region.selected)
      region.onClickRegion(getEvent());
    setPosition(region.sequence[0].frame);
    setSelectedRegion(region);
  };

  const selectNextRegion = (regions=getRegions()) => {
    const r = getSelectedRegion() || regions[0];
    if (!r)
      return;
    selectRegion(getNextRegion(r, regions));
  };

  const selectPreviousRegion = (regions=getRegions()) => {
    return selectNextRegion(regions.toReversed());
  };

  const getTrackingID = region => {
    // region.id == "id-${tracking#}-${part#}#..."
    if (!region || !region.id)
      return { prefix: null, part: null };
    const a = region.id.split('-');
    if (a.length !== 3)
      return { prefix: null, part: null };
    const prefix = `${a[0]}-${a[1]}-`;
    const part = parseInt(a[2].split('#')[0]);
    return { prefix, part };
  };

  const getSameTrackingRegions = (region=getSelectedRegion(), ignoreBeforeRegion=false) => {
    const { prefix, part } = getTrackingID(region);
    if (prefix === null || part === null)
      return [];

    let f = r => r.id.startsWith(prefix);
    if (ignoreBeforeRegion) {
      f = r => {
        const rid = getTrackingID(r);
        if (rid.prefix === null || rid.part === null)
          return false;
        if (rid.prefix !== prefix)
          return false;
        return part <= rid.part;
      };
    }

    return getRegions().filter(f);
  };

  async function selectRegions(regions, title, selectedRegion) {
    selectCancelFlag = false;
    $.blockUI({ message: '' });
    const toast = toastr.info('処理中', `${title} 処理中`, { timeOut: 0, tapToDismiss: false });
    const ev = getEvent({ ctrlKey: true });

    for (let i = 0; i < regions.length; i++) {
      if (selectCancelFlag)
        break;
      await new Promise((resolve, reject) => {
        setTimeout(i => {
          const r = regions[i];
          const m = `${i} / ${regions.length}`;
          toast.find('.toast-message').text(m);
          //$.blockUI({ message: m });  // ちらつく
          if (!isSelectedRegion(r))
            r.onClickRegion(ev);
          resolve();
        }, 0, i);
      });
    }

    if (selectCancelFlag) {
      selectCancelFlag = false;
      selectRegion(selectedRegion);
      toast.find('.toast-title').text(`${title} キャンセル`);
      toast.find('.toast-message').text('キャンセルしました');
      toast.on('click', () => toastr.clear(toast));
      setTimeout(() => {
        toastr.clear(toast);
      }, 5000);
    } else {
      toast.find('.toast-title').text(`${title} 完了`);
      toast.find('.toast-message').text(`${regions.length}リージョン選択しました`);
      toast.on('click', () => toastr.clear(toast));
      setTimeout(() => {
        toastr.clear(toast);
      }, 5000);
    }
    $.unblockUI();
  };

  async function selectSameTrackingRegions({
    region=getSelectedRegion(),
    ignoreBeforeRegion=false
  }) {
    if (!region) {
      const t = toastr.error('リージョンが選択されていません');
      return;
    }

    const { prefix, part } = getTrackingID(region);
    await selectRegions(getSameTrackingRegions(region, ignoreBeforeRegion),
                        ignoreBeforeRegion? `${prefix}${part}以降`: `${prefix.slice(0, -1)}`,
                        region);
  };

  async function selectAllRegions() {
    const selectedRegion = getSelectedRegion();
    await selectRegions(getRegions(), 'すべてのリージョン', selectedRegion);
  }

  //

  $(document).on('keydown', e => {
    if (!isTaskPage())
      return;
    switch (e.key) {
    case 'Escape':
      if (!selectCancelFlag) {
        selectCancelFlag = true;
        e.preventDefault();
      }
      break;
    case '.':
      if (e.ctrlKey && e.altKey && !e.shiftKey) {
        selectNextRegion();
        e.preventDefault();
      }
      break;
    case '>':
      if (e.ctrlKey && e.altKey && e.shiftKey) {
        selectPreviousRegion();
        e.preventDefault();
      }
      break;
    case ']':
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        const r = getSelectedRegion();
        console.log('>>> handle "]" key');
        console.log(r);
        selectNextRegion(getSameTrackingRegions());
        e.preventDefault();
      }
      break;
    case '[':
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        const r = getSelectedRegion();
        selectPreviousRegion(getSameTrackingRegions());
        e.preventDefault();
      }
      break;
    case 't':
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        // 選択中のリージョン以降の同一トラッキングを選択
        console.log('>>> handle "t" key');
        console.log(getSelectedRegion());
        selectSameTrackingRegions({ ignoreBeforeRegion: true });
        e.preventDefault();
      }
      break;
    case 'T':
      if (!e.ctrlKey && !e.altKey && e.shiftKey) {
        // 選択中のリージョンと同一トラッキングを選択
        console.log('>>> handle "T" key');
        console.log(getSelectedRegion());
        selectSameTrackingRegions({ ignoreBeforeRegion: false });
        e.preventDefault();
      }
      break;
    case 'a':
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        selectAllRegions();
        e.preventDefault();
      }
      break;
    }
  });

  const onURLChanged = () => {
    if (!isTaskPage())
      return;
    const f = () => {
      setMinimapEntries(7);
      setTimelineEntries(7);
    };
    setTimeout(f, 1000);
    setTimeout(f, 3000);
    setTimeout(f, 5000);
    setTimeout(f, 7000);
  };
  window.onurlchange = onURLChanged;
  setTimeout(onURLChanged, 100);
})();
