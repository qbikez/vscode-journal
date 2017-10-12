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


namespace CommandIds {
    //	export const completeTask: CommandDefinition = { id: 'journal.completeTask', label: "Complete task"};
    export const applyAutoFix: string = 'standard.applyAutoFix';
}


export class CodeActions {
    private definitions: J.Types.CommandDefinition[];
    private commands: Map<string, lsp.Command> = new Map();

    private taskActions: J.Tasks.Actions; 

    /**
     *
     */
    constructor(public connection: lsp.IConnection, public documents: lsp.TextDocuments) {
        this.taskActions = new J.Tasks.Actions(); 

        this.definitions.concat(this.taskActions.getTaskCommands()); 
        this.definitions.forEach((cd: J.Types.CommandDefinition) => {
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

            this.definitions.forEach((entry: J.Types.CommandDefinition) => {
                if (entry.id === cmd) {
                    Q.fcall(this.taskActions.completeTask, this.connection, ...args)
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
            this.taskActions.scanLine(currentLine, lineNumber, diagnostics);
        });

        return diagnostics;
    }


   


    public provideCodeActions(document: lsp.TextDocumentIdentifier, range: lsp.Range, context: lsp.CodeActionContext, token: lsp.CancellationToken): lsp.Command[] {
        let commands: lsp.Command[] = [];

        context.diagnostics.forEach((diag: lsp.Diagnostic) => {
            this.definitions.forEach((cd: J.Types.CommandDefinition) => {

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

   
}


