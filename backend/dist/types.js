"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartStatus = exports.MaterialStatus = exports.ProjectStatus = void 0;
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["PLANNING"] = "planning";
    ProjectStatus["GATHERING_MATERIALS"] = "gathering_materials";
    ProjectStatus["ASSEMBLING"] = "assembling";
    ProjectStatus["TESTING"] = "testing";
    ProjectStatus["COMPLETED"] = "completed";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var MaterialStatus;
(function (MaterialStatus) {
    MaterialStatus["SUGGESTED"] = "suggested";
    MaterialStatus["APPROVED"] = "approved";
    MaterialStatus["REJECTED"] = "rejected";
    MaterialStatus["ORDERED"] = "ordered";
    MaterialStatus["RECEIVED"] = "received";
})(MaterialStatus || (exports.MaterialStatus = MaterialStatus = {}));
var PartStatus;
(function (PartStatus) {
    PartStatus["SUGGESTED"] = "suggested";
    PartStatus["SELECTED"] = "selected";
    PartStatus["ORDERED"] = "ordered";
    PartStatus["RECEIVED"] = "received";
})(PartStatus || (exports.PartStatus = PartStatus = {}));
