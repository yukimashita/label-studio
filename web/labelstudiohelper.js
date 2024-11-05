// ==UserScript==
// @name         Label Studio入力支援
// @namespace    http://tampermonkey.net/
// @version      2024-05-27
// @description  try to take over the world!
// @author       hiroya@spir.co.jp
// @match        http://0.0.0.0:45547/*
// @match        http://localhost:45547/*
// @match        http://127.0.0.1:45547/*
// @match        http://10.2.0.7:45547/*
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
  toastr.options = {
    positionClass: toastrPositionClass
  };

  GM_addStyle('.lsf-tree-treenode-selected { font-weight: bolder; border-left: solid 10px red; }');
  GM_addStyle('.dm-table__row-wrapper_selected { font-weight: bolder; border-left: solid 10px red; }');

  const isTaskPage = () => {
    if (!unsafeWindow.Htx)
      return false;
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

  const getNextRegion = ({
    currentRegion=getSlectedRegion(),
    regions=getRegions(),
    cyclicSelect=true
  }) => {
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
      console.error(`getRegions().length: ${getRegions().length}`);
      console.error(regions);
      return null;
    }
    const n = i + 1;
    if (n < regions.length)
      return regions[n];
    if (cyclicSelect)
      return regions[0];
    return null;
  };

  const selectRegion = region => {
    if (!region || !region.hasOwnProperty('onClickRegion'))
      return null;
    if (!region.selected)
      region.onClickRegion(getEvent());
    setPosition(region.sequence[0].frame);
    setSelectedRegion(region);
    return region;
  };

  const selectNextRegion = ({
    regions=getRegions(),
    cyclicSelect=true
  }) => {
    const currentRegion = getSelectedRegion() || regions[0];
    if (!currentRegion)
      return null;
    return selectRegion(getNextRegion({
      currentRegion,
      regions,
      cyclicSelect
    }));
  };

  const selectPreviousRegion = ({
    regions=getRegions(),
    cyclicSelect=true
  }) => {
    return selectNextRegion({
      regions: regions.toReversed(),
      cyclicSelect
    });
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

  const getLabelCount = region => {
    if (!region)
      return -1;
    return region.labels.length;
  };

  const getPersonLabelCount = region => {
    if (!region)
      return -1;
    return region.labels
      .filter(l => l.endsWith('さん'))
      .length;
  };

  const getActionLabelCount = region => {
    if (!region)
      return -1;
    return region.labels
      .filter(l => !l.endsWith('さん'))
      .length;
  };

  const getEmptyLabelRegions = () => {
    return getRegions()
      .filter(r => getLabelCount(r) === 0);
  };

  const getEmptyLabelRegion = (regions=getRegions()) => {
    for (const r of regions) {
      if (getLabelCount(r) === 0)
        return r;
    }
    return null;
  };

  const selectNextEmptyLabelRegion = (regions=getRegions(), reverse=false) => {
    const s = getSelectedRegion() || regions[0];
    if (getLabelCount(s) === 0) {
      const emptyLabelRegions = reverse?
            getEmptyLabelRegions().toReversed():
            getEmptyLabelRegions();
      if (!selectNextRegion({
        regions: emptyLabelRegions
      }))
      {
        toastr.info('🎉 ラベルなしはありません');
      }
      return;
    }
    // 選択中のリージョンはラベルがついてるので
    // 以降のラベルがついてないリージョンを探す
    const index = regions
          .findIndex(r => r.id === s.id);
    if (index === -1) {
      console.error('>>> selectNextEmptyLabelRegion');
      console.error('index === -1');
      return;
    }
    if (selectRegion(getEmptyLabelRegion(regions.slice(index))))
      return;
    if (!selectRegion(getEmptyLabelRegion(regions.slice(0, index))))
      toastr.info('🎉 ラベルなしはありません');
  };

  const selectPreviousEmptyLabelRegion = (regions=getRegions()) => {
    selectNextEmptyLabelRegion(regions.toReversed(), true);
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
        selectNextRegion({});
        e.preventDefault();
      }
      break;
    case '>':
      if (e.ctrlKey && e.altKey && e.shiftKey) {
        selectPreviousRegion({});
        e.preventDefault();
      }
      break;
    case ']':
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        const r = getSelectedRegion();
        console.log('>>> handle "]" key');
        console.log(r);
        if (!selectNextRegion({
          regions: getSameTrackingRegions(),
          cyclicSelect: false
        }))
        {
          toastr.info('これより後はありません', '', { timeOut: 1000 });
        }
        e.preventDefault();
      }
      break;
    case '[':
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        const r = getSelectedRegion();
        if (!selectPreviousRegion({
          regions: getSameTrackingRegions(),
          cyclicSelect: false
        }))
        {
          toastr.info('これより前はありません', '', { timeOut: 1000 });
        }
        e.preventDefault();
      }
      break;
    case '/':
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        // 選択中のリージョン以降の同一トラッキングを選択
        console.log('>>> handle "/" key');
        console.log(getSelectedRegion());
        selectSameTrackingRegions({ ignoreBeforeRegion: true });
        e.preventDefault();
      }
      break;
    case '?':
      if (!e.ctrlKey && !e.altKey && e.shiftKey) {
        // 選択中のリージョンと同一トラッキングを選択
        console.log('>>> handle "?" key');
        console.log(getSelectedRegion());
        selectSameTrackingRegions({ ignoreBeforeRegion: false });
        e.preventDefault();
      }
      break;
    case '}':
      selectNextEmptyLabelRegion();
      break;
    case '{':
      selectPreviousEmptyLabelRegion();
      break;
    case 'a':
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        selectAllRegions();
        e.preventDefault();
      }
      break;
    }
  });

  setInterval(() => {
    if (!isTaskPage())
      return;

    setMinimapEntries(7);
    setTimelineEntries(7);

    const params = new URL(location).searchParams;
    const regionID = params.get('region');
    if (regionID === null)
      return;
    const region = getRegions()
          .find(r => r.id.split('#')[0] === regionID);
    selectRegion(region);
  }, 1000);
})();
