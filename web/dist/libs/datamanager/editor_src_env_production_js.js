"use strict";
(self["webpackChunklabelstudio"] = self["webpackChunklabelstudio"] || []).push([["editor_src_env_production_js"],{

/***/ "../editor/src/env/production.js":
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var core_js_modules_es_object_assign_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("../../node_modules/core-js/modules/es.object.assign.js");
/* harmony import */ var core_js_modules_es_object_assign_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_object_assign_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _core_External__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("../editor/src/core/External.js");
/* harmony import */ var _utils_messages__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("../editor/src/utils/messages.jsx");



function getData(task) {
  if (task && task.data) {
    return Object.assign({}, task, {
      data: JSON.stringify(task.data)
    });
  }
  return task;
}
function getState(task) {
  return {
    annotations: task == null ? void 0 : task.annotations,
    completions: task == null ? void 0 : task.completions,
    predictions: task == null ? void 0 : task.predictions
  };
}

/**
 * LS will render in this part
 */
function rootElement(element) {
  let root;
  if (typeof element === "string") {
    root = document.getElementById(element);
  } else {
    root = element;
  }
  root.innerHTML = "";
  return root;
}

/**
 * Function to configure application with callbacks
 * @param {object} params
 */
function configureApplication(params) {
  var _params$forceAutoAnno, _params$forceAutoAcce;
  // callbacks for back compatibility
  const osCB = params.submitAnnotation || params.onSubmitAnnotation;
  const ouCB = params.updateAnnotation || params.onUpdateAnnotation;
  const odCB = params.deleteAnnotation || params.onDeleteAnnotation;
  const options = {
    // communication with the server
    // fetch: params.fetch || Requests.fetcher,
    // patch: params.patch || Requests.patch,
    // post: params.post || Requests.poster,
    // remove: params.remove || Requests.remover,

    // communication with the user
    settings: params.settings || {},
    messages: Object.assign({}, _utils_messages__WEBPACK_IMPORTED_MODULE_2__["default"], params.messages),
    // callbacks and event handlers
    onSubmitAnnotation: params.onSubmitAnnotation ? osCB : _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onSubmitAnnotation,
    onUpdateAnnotation: params.onUpdateAnnotation ? ouCB : _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onUpdateAnnotation,
    onDeleteAnnotation: params.onDeleteAnnotation ? odCB : _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onDeleteAnnotation,
    onSkipTask: params.onSkipTask ? params.onSkipTask : _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onSkipTask,
    onUnskipTask: params.onUnskipTask ? params.onUnskipTask : _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onUnskipTask,
    onSubmitDraft: params.onSubmitDraft,
    onPresignUrlForProject: params.onPresignUrlForProject,
    onTaskLoad: params.onTaskLoad || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onTaskLoad,
    onLabelStudioLoad: params.onLabelStudioLoad || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onLabelStudioLoad,
    onEntityCreate: params.onEntityCreate || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onEntityCreate,
    onEntityDelete: params.onEntityDelete || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onEntityDelete,
    onGroundTruth: params.onGroundTruth || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onGroundTruth,
    onSelectAnnotation: params.onSelectAnnotation || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onSelectAnnotation,
    onAcceptAnnotation: params.onAcceptAnnotation || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onAcceptAnnotation,
    onRejectAnnotation: params.onRejectAnnotation || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onRejectAnnotation,
    onStorageInitialized: params.onStorageInitialized || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onStorageInitialized,
    onNextTask: params.onNextTask || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onNextTask,
    onPrevTask: params.onPrevTask || _core_External__WEBPACK_IMPORTED_MODULE_1__["default"].onPrevTask,
    // other settings aka flags
    forceAutoAnnotation: (_params$forceAutoAnno = params.forceAutoAnnotation) != null ? _params$forceAutoAnno : false,
    forceAutoAcceptSuggestions: (_params$forceAutoAcce = params.forceAutoAcceptSuggestions) != null ? _params$forceAutoAcce : false
  };
  return options;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  getData,
  getState,
  rootElement,
  configureApplication
});

/***/ })

}]);
//# sourceMappingURL=editor_src_env_production_js.js.map