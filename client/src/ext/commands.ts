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

import * as vscode from 'vscode';
import * as Q from 'q';
import * as J from '../.';

export interface Commands {
    processInput(): Thenable<vscode.TextEditor>
    showNote(): Thenable<vscode.TextEditor>
    showEntry(offset: number): Thenable<vscode.TextEditor>
    loadJournalWorkspace(): Thenable<void>
    editJournalConfiguration(): Thenable<vscode.TextEditor>
}


export class JournalCommands implements Commands {

    /**
     *
     */
    constructor(public main: J.Journal) {
    }
    /**
     * Opens the editor for a specific day. Supported values are explicit dates (in ISO format),
     * offsets (+ or - as prefix and 0) and weekdays (next wednesday) 
     */
    public processInput(): Thenable<vscode.TextEditor> {
        let deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();
        let inputVar: J.Model.Input = null;
        let docVar: vscode.TextDocument = null;

        this.main.getVSCAdapter().getUserInput("Enter day or memo (with flags) ")
            .then((value: string) => this.main.loadPageForInput(value))
            .then(document => this.main.getVSCAdapter().showDocument(document))
            .then((editor: vscode.TextEditor) => deferred.resolve(editor))
            .catch((error: any) => {
                if (error != 'cancel') {
                    console.error("[Journal]", "Failed to get file, Reason: ", error);
                    this.showError("Failed to process user input.");
                }
                deferred.reject(error);
            });
        return deferred.promise;
    }

    /**
     * Called by command 'Journal:open'. Opens a new windows with the Journal base directory as root. 
     * 
     * 
     */
    public loadJournalWorkspace(): Thenable<void> {
        var deferred: Q.Deferred<void> = Q.defer<void>();

        let path = vscode.Uri.file(this.main.getConfig().getBasePath());
        vscode.commands.executeCommand('vscode.openFolder', path, true)
            .then(success => {
                deferred.resolve(null);
            },
            error => {
                console.error("[Journal]", "Failed to get file, Reason: ", error);
                this.showError("Failed to create and load notes");
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public showNote(): Thenable<vscode.TextEditor> {
        var deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();

        this.main.getVSCAdapter().getUserInput("Enter name for your notes")
            .then((input: string) => this.main.createJournalNote(input))
            .then((doc: vscode.TextDocument) => this.main.getVSCAdapter().showDocument(doc))
            .then((editor: vscode.TextEditor) => deferred.resolve(editor))
            .catch(reason => {
                if (reason != 'cancel') {
                    console.error("[Journal]", "Failed to get file, Reason: ", reason);
                    this.showError("Failed to create and load notes");
                }
                deferred.reject(reason);
            })

        return deferred.promise;
    }


    /**
     * Implements commands "yesterday", "today", "yesterday"
     * @param offset 
     */
    public showEntry(offset: number): Thenable<vscode.TextEditor> {
        var deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();


        this.main.loadPageForInput(offset.toString())
            .then((doc: vscode.TextDocument) =>  this.main.getVSCAdapter().showDocument(doc) )
            .then((editor: vscode.TextEditor) => deferred.resolve(editor))
            .catch((error: any) => {
                if (error != 'cancel') {
                    console.error("[Journal]", "Failed to get file, Reason: ", error);
                    this.showError("Failed to process user input.");
                }
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public editJournalConfiguration(): Q.Promise<vscode.TextEditor> {
        let deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();
        this.main.getVSCAdapter().pickConfigToEdit()
            .then(filepath => this.main.getVSCAdapter().loadTextDocument(filepath))
            .then(document => this.main.getVSCAdapter().showDocument(document))
            .then(editor => deferred.resolve(editor))
            .catch(error => {
                if (error != 'cancel') {
                    console.error("[Journal]", "Failed to get file, Reason: ", error);
                    this.showError("Failed to create and load notes");

                }
                deferred.reject(error);
            })

        return deferred.promise;
    }


    public showError(error: string | Q.Promise<string>): void {
        (<Q.Promise<string>>error).then((value) => {
            // conflict between Q.IPromise and vscode.Thenable
            vscode.window.showErrorMessage(value);
        });
    }
}
