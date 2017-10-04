// Copyright (C) 2017  Patrick Maué
// 
// This file is part of vscode-journal.
// 
// vscode-journal is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// vscode-journal is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with vscode-journal.  If not, see <http://www.gnu.org/licenses/>.
// 
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode-languageserver");
class JournalCodeActions {
    /**
     *
     */
    constructor() {
        this.commands = new Map();
        this.definitions = [
            { id: 'journal.completeTask', label: "Complete task", action: this.completeTask },
            { id: 'journal.shiftTask', label: "Shift task to today", action: this.shiftTask },
            { id: 'journal.uncompleteTask', label: "Reopen this task", action: this.uncompleteTask }
        ];
        vscode.Command.create;
        this.definitions.forEach((cd) => {
            this.commands.set(cd.id, vscode.Command.create(cd.id, cd.action, this));
        });
    }
    scanDocument(doc) {
        if (doc.languageId !== 'markdown') {
            return;
        }
        let diagnostics = [];
        let lines = doc.getText().split(/\r?\n/g);
        lines.forEach((currentLine, lineNumber) => {
            this.checkOpenTask(currentLine, lineNumber, diagnostics);
            this.checkCompletedTask(currentLine, lineNumber, diagnostics);
        });
        return diagnostics;
    }
    checkCompletedTask(line, lineNumber, diagnostics) {
        let exprString = "(\\*)\\s(\\[[x|X]\\])\\s+(.+)";
        let expr = new RegExp(exprString);
        if (expr.test(line)) {
            let range = vscode.Range.create(lineNumber, 0, lineNumber, line.length);
            let diag = vscode.Diagnostic.create(range, "Reopen this task", vscode.DiagnosticSeverity.Hint);
            diagnostics.push(diag);
        }
    }
    checkOpenTask(line, lineNumber, diagnostics) {
        let exprString = "(\\*)\\s(\\[\\s{0,1}\\])\\s+(.+)";
        let expr = new RegExp(exprString);
        if (expr.test(line)) {
            let range = vscode.Range.create(lineNumber, 0, lineNumber, line.length);
            diagnostics.push(vscode.Diagnostic.create(range, "Complete task", vscode.DiagnosticSeverity.Hint));
            diagnostics.push(vscode.Diagnostic.create(range, "Shift task to today", vscode.DiagnosticSeverity.Hint));
        }
    }
    provideCodeActions(document, range, context, token) {
        let commands = [];
        context.diagnostics.forEach((diag) => {
            this.definitions.forEach((cd) => {
                //  console.log("\"", cd.label, "\"", "<>", "\"", diag.message, "\"", cd.label.localeCompare(diag.message));
                if (cd.label.localeCompare(diag.message) == 0) {
                    commands.push({
                        title: cd.label,
                        command: cd.action,
                        arguments: [document, diag.range, diag.message]
                    });
                }
            });
        });
        return commands;
    }
    completeTask(document, range, message) {
        console.log("running code action complete");
    }
    shiftTask(document, range, message) {
        console.log("running code action shift");
    }
    uncompleteTask(document, range, message) {
        console.log("running code action uncomplete");
    }
}
exports.JournalCodeActions = JournalCodeActions;
//# sourceMappingURL=codeActions.js.map