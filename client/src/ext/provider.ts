// Copyright (C) 2016  Patrick Maué
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
import { log } from 'util';
import { connect } from 'net';

// deprecated, code actions don't really make sense for the journal

'use strict';

import * as Q from 'q';
import * as journal from '.';
import * as vscode from 'vscode';
import * as cp from 'child_process';


export class JournalCompletionProvider implements vscode.CompletionItemProvider {
    constructor() {
        console.log("Completion Provider registered");

    }

    public provideCompletionItems(
        doc: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.CompletionItem[]> {

        var deferred: Q.Deferred<vscode.CompletionItem[]> = Q.defer<vscode.CompletionItem[]>();

        console.log("completion called");



        let lines: string[] = doc.getText().split(/\r?\n/g);
        let currentLine: string = lines[position.line];

        console.log("Content: " + currentLine + " with length " + currentLine.length);
        console.log("Line: " + position.line + " Char: " + position.character);


        let exprString: string = "(\\*)\\s(\\[\\s{0,1}\\])\\s+(.+)"
        let expr: RegExp = new RegExp(exprString);

        new vscode.Position(position.line, 3)
        let replaceRange: vscode.Range = new vscode.Range(new vscode.Position(position.line, 3), new vscode.Position(position.line, 3));
        let completeEdit: vscode.TextEdit = vscode.TextEdit.replace(replaceRange, "x");
        let shiftEdit: vscode.TextEdit = vscode.TextEdit.replace(replaceRange, ">");

        /* let's just replace the whole line
        let lineRange: vscode.Range = new vscode.Range(new vscode.Position(position.line, 0), new vscode.Position(position.line, currentLine.length)); 
          {	
                    label: 'Complete Task',
                    sortText: "1", 
                    range: replaceRange, 
                    insertText: "This is a replacement", 
                    kind: vscode.CompletionItemKind.Enum
                },
                
                {   
                    label: 'Shift to tomorrow',
                    sortText: "2", 
                    textEdit: shiftEdit, 
                    kind: vscode.CompletionItemKind.Reference, 
                    filterText: "false"
                    
                }
            */

        let shift: vscode.CompletionItem = new vscode.CompletionItem("Shift to tomorrow", vscode.CompletionItemKind.Reference);
        shift.additionalTextEdits = [vscode.TextEdit.replace(replaceRange, ">")],
            shift.sortText = "_";
        shift.insertText = "";
        shift.filterText = "false";
        // shift.insertText = ">"; 
        // shift.range = new vscode.Range(new vscode.Position(position.line, 0), new vscode.Position(position.line, currentLine.length-1))

        console.log(shift);






        if (expr.test(currentLine)) {
            console.log("Match");
            deferred.resolve([
                shift
            ]
            );
        } else {
            console.log("No match");
            deferred.resolve([]);
        }

        return deferred.promise;

    }



}

/*

export class JournalCodeActionProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument, range: vscode.Range,
        context: vscode.CodeActionContext, token: vscode.CancellationToken):
        Thenable<vscode.Command[]> {
        var deferred: Q.Deferred<vscode.Command[]> = Q.defer<vscode.Command[]>();

        console.log("code action called");

        
        deferred.resolve([]); 
        return deferred.promise;


    }
}
*/

const MARKDOWN_MODE: vscode.DocumentFilter = { language: 'markdown', scheme: 'file' };
type CommandDefinition = { id: string, label: string, action: any}

export class JournalActionsProvider implements vscode.CodeActionProvider {

    private definitions: CommandDefinition[] = [
        {id: 'journal.completeTask', label: "Complete task", action: this.completeTask}, 
        {id: 'journal.shiftTask', label: "Shift task to today", action: this.shiftTask}, 
        {id: 'journal.uncompleteTask', label: "Reopen this task", action: this.uncompleteTask}
    ]; 

    private commands: Map<string, vscode.Disposable> = new Map();
    private diagnosticCollection: vscode.DiagnosticCollection;

    public activate(subscriptions: vscode.Disposable[]) {

        this.definitions.forEach( (cd: CommandDefinition) => {
            this.commands.set(cd.id, vscode.commands.registerCommand(cd.id, cd.action, this)); 
        }); 


        subscriptions.push(this);
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection();

        vscode.workspace.onDidOpenTextDocument(this.doHlint, this, subscriptions);
        vscode.workspace.onDidCloseTextDocument((textDocument) => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);

        vscode.workspace.onDidSaveTextDocument(this.doHlint, this);

        // Hlint all open haskell documents
        vscode.workspace.textDocuments.forEach(this.doHlint, this);

        vscode.languages.registerCodeActionsProvider(MARKDOWN_MODE, this)

    }

    public dispose(): void {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
        this.commands.forEach(cmd => cmd.dispose()); 
    }

    private doHlint(doc: vscode.TextDocument) {
        if (doc.languageId !== 'markdown') {
            return;
        }

        let diagnostics: vscode.Diagnostic[] = [];
        let lines: string[] = doc.getText().split(/\r?\n/g);

        lines.forEach((currentLine, lineNumber) => {
            this.checkOpenTask(currentLine, lineNumber, diagnostics);
            this.checkCompletedTask(currentLine, lineNumber, diagnostics);
        });

        this.diagnosticCollection.set(doc.uri, diagnostics);
    }

    private checkOpenTask(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {

        let exprString: string = "(\\*)\\s(\\[\\s{0,1}\\])\\s+(.+)"
        let expr: RegExp = new RegExp(exprString);

        if (expr.test(line)) {
            let range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
            diagnostics.push(new vscode.Diagnostic(range, "Complete task", vscode.DiagnosticSeverity.Hint));

            diagnostics.push(new vscode.Diagnostic(range, "Shift task to today", vscode.DiagnosticSeverity.Hint));
        }
    }

    private checkCompletedTask(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {

        let exprString: string = "(\\*)\\s(\\[[x|X]\\])\\s+(.+)"
        let expr: RegExp = new RegExp(exprString);

        if (expr.test(line)) {
            let range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
            diagnostics.push(new vscode.Diagnostic(range, "Reopen this task", vscode.DiagnosticSeverity.Hint));
        }
    }

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
        let diagnostic: vscode.Diagnostic = context.diagnostics[0];
        let commands: vscode.Command[] = [];

        context.diagnostics.forEach((diag: vscode.Diagnostic) => {
            this.definitions.forEach((cd:CommandDefinition) => {

              //  console.log("\"", cd.label, "\"", "<>", "\"", diag.message, "\"", cd.label.localeCompare(diag.message));
                if(cd.label.localeCompare(diag.message) == 0) {
                    
                    commands.push({
                        title: cd.label, 
                        command: cd.id, 
                        arguments: [document, diagnostic.range, diagnostic.message]
                    }); 
                }
            }); 
        });
        return commands;
    }

    private completeTask(document: vscode.TextDocument, range: vscode.Range, message: string): any {
        console.log("running code action complete");
    }

    private shiftTask(document: vscode.TextDocument, range: vscode.Range, message: string): any {
        console.log("running code action shift");
    }

    private uncompleteTask(document: vscode.TextDocument, range: vscode.Range, message: string): any {
        console.log("running code action uncomplete");
    }
}