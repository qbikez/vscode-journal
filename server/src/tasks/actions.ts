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
import { defer } from 'Q';

import * as Q from 'q';
import * as lsp from 'vscode-languageserver';
import * as J from '../.'



export class Actions {

    public getTaskCommands(): J.Types.CommandDefinition[] {
        return [
            { id: 'journal.completeTask', label: "Complete task", action: this.completeTask },
            { id: 'journal.shiftTask', label: "Shift task to today", action: this.completeTask },
            { id: 'journal.uncompleteTask', label: "Reopen this task", action: this.completeTask }
        ];
    }

    public scanLine(line: string, lineNumber: number, diagnostics: lsp.Diagnostic[]): void {
        this.checkCompletedTask(line, lineNumber, diagnostics); 
        this.checkOpenTask(line, lineNumber, diagnostics); 
    }

    private checkCompletedTask(line: string, lineNumber: number, diagnostics: lsp.Diagnostic[]): void {

        let exprString: string = "(\\*)\\s(\\[[x|X]\\])\\s+(.+)"
        let expr: RegExp = new RegExp(exprString);

        if (expr.test(line)) {
            let range = lsp.Range.create(lineNumber, 0, lineNumber, line.length);
            let diag = lsp.Diagnostic.create(range, "Reopen this task", lsp.DiagnosticSeverity.Hint);
            diagnostics.push(diag);
        }
    }

    private checkOpenTask(line: string, lineNumber: number, diagnostics: lsp.Diagnostic[]): void {

        let exprString: string = "(\\*)\\s(\\[\\s{0,1}\\])\\s+(.+)"
        let expr: RegExp = new RegExp(exprString);

        if (expr.test(line)) {
            let range = lsp.Range.create(lineNumber, 0, lineNumber, line.length);
            diagnostics.push(lsp.Diagnostic.create(range, "Complete task", lsp.DiagnosticSeverity.Hint));
            diagnostics.push(lsp.Diagnostic.create(range, "Shift task to today", lsp.DiagnosticSeverity.Hint));
        }
    }


    public completeTask(connection: lsp.IConnection, document: lsp.TextDocument, range: lsp.Range, message: string): Q.Promise<void> {

        let deferred: Q.Deferred<void> = Q.defer();

        // see https://github.com/Microsoft/vscode-languageserver-node/blob/master/server/src/main.ts

        // open question, how to do it with apply edit through json rpc

        // : lsp.RequestType<lsp.ApplyWorkspaceEditParams, lsp.ApplyWorkspaceEditResponse void, void>

        Q.fcall(() => {
            try {
                let updates = new J.Types.WorkspaceUpdates();

                let line: number = range.start.line;
                let replaceRange: lsp.Range = lsp.Range.create(lsp.Position.create(line, 3), lsp.Position.create(line, 4));
                let completeEdit: lsp.TextEdit = lsp.TextEdit.replace(replaceRange, "x");



                updates.addDocumentUpdate(document, [completeEdit]);

                connection.workspace.applyEdit(updates)
                    .then((response) => {
                        if (response.applied) deferred.resolve();
                        else deferred.reject("Failed to apply remote edits");
                    });

            } catch (error) {
                deferred.reject("Unknown Error: " + error);
            }
        });
        return deferred.promise;

    }

    public shiftTaskToToday(connection: lsp.IConnection, document: lsp.TextDocument, range: lsp.Range, message: string): any {
        let deferred: Q.Deferred<void> = Q.defer();

        Q.fcall(() => {
            try {
                let updates = new J.Types.WorkspaceUpdates();

                let line: number = range.start.line;
                let replaceRange: lsp.Range = lsp.Range.create(lsp.Position.create(line, 3), lsp.Position.create(line, 4));
                let completeEdit: lsp.TextEdit = lsp.TextEdit.replace(replaceRange, ">");


                
                updates.addDocumentUpdate(document, [completeEdit]);

                connection.workspace.applyEdit(updates)
                    .then((response) => {
                        if (response.applied) deferred.resolve();
                        else deferred.reject("Failed to apply remote edits");
                    });

            } catch (error) {
                deferred.reject("Unknown Error: " + error);
            }
        });
        return deferred.promise;
    }

    public uncompleteTask(document: lsp.TextDocument, range: lsp.Range, message: string): any {
        console.log("running code action uncomplete");
    }

}