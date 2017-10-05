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

type CommandDefinition = { id: string, label: string, action: any }


namespace CommandIds {
    //	export const completeTask: CommandDefinition = { id: 'journal.completeTask', label: "Complete task"};
    export const applyAutoFix: string = 'standard.applyAutoFix';
}


export class JournalCodeActions {
    private definitions: CommandDefinition[];
    private commands: Map<string, lsp.Command> = new Map();

    /**
     *
     */
    constructor(public connection: lsp.IConnection, public documents: lsp.TextDocuments) {

        this.definitions = [
            { id: 'journal.completeTask', label: "Complete task", action: this.completeTask },
            { id: 'journal.shiftTask', label: "Shift task to today", action: this.shiftTask },
            { id: 'journal.uncompleteTask', label: "Reopen this task", action: this.uncompleteTask }
        ];


        this.definitions.forEach((cd: CommandDefinition) => {
            this.commands.set(cd.id, lsp.Command.create(cd.id, cd.action.name, this));
        });

        this.listen();
    }

    public listen(): void {
        this.documents.onDidChangeContent((change) => {
            let diagnostics: lsp.Diagnostic[] = this.scanDocument(change.document);

            // Send the computed diagnostics to lsp.
            this.connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
        });

        this.connection.onCodeAction(async (param) => {
            let commands: lsp.Command[] = this.provideCodeActions(param.textDocument, param.range, param.context, null);
            return commands;
        });

        this.connection.onExecuteCommand(async (param) => {
            this.connection.console.log("Running server-side command: " + param.command);
            let args: any = param.arguments;
            let cmd: string = param.command;

            this.definitions.forEach((entry: CommandDefinition) => {
                if (entry.id === cmd) {
                    Q.fcall(this.completeTask, this.connection, ...args)
                        .catch((msg) => {
                            this.showClientError(msg);
                        });
                }
            })
        });


    }


    public showClientError(message: string) {
        this.connection.console.error(message);
    }

    public scanDocument(doc: lsp.TextDocument): lsp.Diagnostic[] {
        if (doc.languageId !== 'markdown') {
            return;
        }

        let diagnostics: lsp.Diagnostic[] = [];
        let lines: string[] = doc.getText().split(/\r?\n/g);

        lines.forEach((currentLine, lineNumber) => {
            this.checkOpenTask(currentLine, lineNumber, diagnostics);
            this.checkCompletedTask(currentLine, lineNumber, diagnostics);
        });

        return diagnostics;
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


    public provideCodeActions(document: lsp.TextDocumentIdentifier, range: lsp.Range, context: lsp.CodeActionContext, token: lsp.CancellationToken): lsp.Command[] {
        let commands: lsp.Command[] = [];

        context.diagnostics.forEach((diag: lsp.Diagnostic) => {
            this.definitions.forEach((cd: CommandDefinition) => {

                //  console.log("\"", cd.label, "\"", "<>", "\"", diag.message, "\"", cd.label.localeCompare(diag.message));
                if (cd.label.localeCompare(diag.message) == 0) {

                    commands.push({
                        title: cd.label,
                        command: cd.id,
                        arguments: [document, diag.range, diag.message]
                    });
                    //console.log("\"", cd.id, "\"", "<>", "\"", diag.message);

                }
            });
        });
        return commands;
    }

    public completeTask(connection: lsp.IConnection, document: lsp.TextDocument, range: lsp.Range, message: string): Q.Promise<void> {
        console.log("running code action complete");

        let deferred: Q.Deferred<void> = Q.defer();

        // see https://github.com/Microsoft/vscode-languageserver-node/blob/master/server/src/main.ts

        // open question, how to do it with apply edit through json rpc

        // : lsp.RequestType<lsp.ApplyWorkspaceEditParams, lsp.ApplyWorkspaceEditResponse void, void>

        Q.fcall(() => {
            try {
                let updates = new WorkspaceUpdates();

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





        // this.connection.workspace.applyEdit(); 


        // this.connection.sendNotification()

        return deferred.promise;

    }

    public shiftTask(document: lsp.TextDocument, range: lsp.Range, message: string): any {
        console.log("running code action shift");
    }

    public uncompleteTask(document: lsp.TextDocument, range: lsp.Range, message: string): any {
        console.log("running code action uncomplete");
    }
}


export class WorkspaceUpdates implements lsp.WorkspaceEdit {
    documentChanges?: lsp.TextDocumentEdit[];

    constructor() {
        this.documentChanges = [];         
    }

    public addDocumentUpdate(document: lsp.TextDocument, edit: lsp.TextEdit[]) {
        this.documentChanges.push(lsp.TextDocumentEdit.create(document, edit));
    }

}
