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
import { ENGINE_METHOD_CIPHERS } from 'constants';

import * as Q from 'q';
import * as vscode from 'vscode-languageserver';

type CommandDefinition = { id: string, label: string, action: any }

export class JournalCodeActions {
    private definitions: CommandDefinition[];
    private commands: Map<string, vscode.Command> = new Map();

    /**
     *
     */
    constructor(public connection: vscode.IConnection, public documents: vscode.TextDocuments) {

        this.definitions = [
            { id: 'journal.completeTask', label: "Complete task", action: this.completeTask },
            { id: 'journal.shiftTask', label: "Shift task to today", action: this.shiftTask },
            { id: 'journal.uncompleteTask', label: "Reopen this task", action: this.uncompleteTask }
        ];

        vscode.Command.create

        this.definitions.forEach((cd: CommandDefinition) => {
            this.commands.set(cd.id, vscode.Command.create(cd.id, cd.action, this));
        });

        this.listen();
    }

    public listen(): void {
        this.documents.onDidChangeContent((change) => {
            let diagnostics: vscode.Diagnostic[] = this.scanDocument(change.document);

            // Send the computed diagnostics to VSCode.
            this.connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
        });

        this.connection.onCodeAction(async (param) => {
            let commands: vscode.Command[] = this.provideCodeActions(param.textDocument, param.range, param.context, null);
            return commands;
        });

        this.connection.onExecuteCommand(async (param) => {
            let args: any = param.arguments; 
            let cmd: string = param.command; 

            this.definitions.forEach( (entry: CommandDefinition) => {
                if(entry.action === cmd) {
                    let method = this.commands.get(entry.id); 
                    method.arguments = args; 
                }
            })
        }); 

    }

    public scanDocument(doc: vscode.TextDocument): vscode.Diagnostic[] {
        if (doc.languageId !== 'markdown') {
            return;
        }

        let diagnostics: vscode.Diagnostic[] = [];
        let lines: string[] = doc.getText().split(/\r?\n/g);

        lines.forEach((currentLine, lineNumber) => {
            this.checkOpenTask(currentLine, lineNumber, diagnostics);
            this.checkCompletedTask(currentLine, lineNumber, diagnostics);
        });

        return diagnostics;
    }


    private checkCompletedTask(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {

        let exprString: string = "(\\*)\\s(\\[[x|X]\\])\\s+(.+)"
        let expr: RegExp = new RegExp(exprString);

        if (expr.test(line)) {
            let range = vscode.Range.create(lineNumber, 0, lineNumber, line.length);
            let diag = vscode.Diagnostic.create(range, "Reopen this task", vscode.DiagnosticSeverity.Hint);
            diagnostics.push(diag);
        }
    }

    private checkOpenTask(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {

        let exprString: string = "(\\*)\\s(\\[\\s{0,1}\\])\\s+(.+)"
        let expr: RegExp = new RegExp(exprString);

        if (expr.test(line)) {
            let range = vscode.Range.create(lineNumber, 0, lineNumber, line.length);
            diagnostics.push(vscode.Diagnostic.create(range, "Complete task", vscode.DiagnosticSeverity.Hint));
            diagnostics.push(vscode.Diagnostic.create(range, "Shift task to today", vscode.DiagnosticSeverity.Hint));
        }
    }


    public provideCodeActions(document: vscode.TextDocumentIdentifier, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
        let commands: vscode.Command[] = [];

        context.diagnostics.forEach((diag: vscode.Diagnostic) => {
            this.definitions.forEach((cd: CommandDefinition) => {

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

    public completeTask(document: vscode.TextDocument, range: vscode.Range, message: string): any {
        console.log("running code action complete");
    }

    public shiftTask(document: vscode.TextDocument, range: vscode.Range, message: string): any {
        console.log("running code action shift");
    }

    public uncompleteTask(document: vscode.TextDocument, range: vscode.Range, message: string): any {
        console.log("running code action uncomplete");
    }
}


