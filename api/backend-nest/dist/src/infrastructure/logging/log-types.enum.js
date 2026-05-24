"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogStatus = exports.LogType = void 0;
var LogType;
(function (LogType) {
    LogType["EVENT"] = "event";
    LogType["ERROR"] = "error";
    LogType["WORKER"] = "worker";
    LogType["API"] = "api";
    LogType["DEADLETTER"] = "deadletter";
})(LogType || (exports.LogType = LogType = {}));
var LogStatus;
(function (LogStatus) {
    LogStatus["SUCCESS"] = "success";
    LogStatus["FAILED"] = "failed";
    LogStatus["RETRYING"] = "retrying";
    LogStatus["DEADLETTER"] = "deadletter";
})(LogStatus || (exports.LogStatus = LogStatus = {}));
//# sourceMappingURL=log-types.enum.js.map