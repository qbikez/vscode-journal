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
import * as vscode from 'vscode';

import Journal from './journal';
import * as journal from './util';
import * as path from 'path'; 
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

'use strict';

const MARKDOWN_MODE: vscode.DocumentFilter = { language: 'markdown', scheme: 'file' };

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('vscode-journal is now active!');

    let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("journal");
    let journal = new Journal(config);


    let startup = new JournalStartup(context, journal);
    startup.configureCommands();
    // startup.registerProviders();
    startup.runServer(); 

    // some dev features (stuff where we are waiting for updates in the extension API)
    if (journal.getConfig().isDevEnabled()) {
        context.subscriptions.push(
            vscode.commands.registerCommand('journal.test', function () {
                // The code you place here will be executed every time your command is executed

                function delayedQuickPickItems() {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => resolve(['aaaa', 'bbbb', 'cccc', 'abc', 'bcd']), 2000)
                    })
                }

                // Display a message box to the user
                // vscode.window.showQuickPick(delayedQuickPickItems()).then(x => vscode.window.showInformationMessage(x))
            }),
            vscode.commands.registerCommand('journal.day2', () => {
                // journal.openDayByInputOrSelection().catch(reason => vscode.window.showErrorMessage(reason));
            })
        );
    }


}

class JournalStartup {
    /**
     *
     */
    constructor(public context: vscode.ExtensionContext, public journal: Journal) {

    }

    public showError(error: string | Q.Promise<string>) {
        (<Q.Promise<string>>error).then((value) => {
            // conflict between Q.IPromise and vscode.Thenable
            vscode.window.showErrorMessage(value);
        });
    }

    public registerProviders(): void {
        this.context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(MARKDOWN_MODE, new journal.JournalCompletionProvider()),
            // Vvscode.languages.registerCodeActionsProvider(MARKDOWN_MODE, new journal.JournalCodeActionProvider())
        );

        new journal.JournalActionsProvider().activate(this.context.subscriptions);
    }

    public configureCommands(): void {
        this.context.subscriptions.push(
            vscode.commands.registerCommand('journal.today', () => {
                this.journal.openDay(0).catch(error => this.showError(error));
            }),
            vscode.commands.registerCommand('journal.yesterday', () => {
                this.journal.openDay(-1).catch(error => this.showError(error));
            }),
            vscode.commands.registerCommand('journal.tomorrow', () => {
                this.journal.openDay(1).catch(error => this.showError(error));
            }),
            vscode.commands.registerCommand('journal.day', () => {
                this.journal.openDayByInput().catch(error => this.showError(error));
            }),
            vscode.commands.registerCommand('journal.memo', () => {
                this.journal.openDayByInput().catch(error => this.showError(error));
            }),
            vscode.commands.registerCommand('journal.note', () => {
                this.journal.createNote().catch(error => this.showError(error));
            }),
            vscode.commands.registerCommand('journal.open', () => {
                this.journal.openJournal().catch(error => this.showError(error));
            }),


        );
    }

    public runServer(): void {

        // see https://github.com/Microsoft/vscode-languageserver-node-example/blob/master/client/src/extension.ts
        let serverModule = this.context.asAbsolutePath(path.join('server', 'lang-server.js'));
        let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

        let serverOptions: ServerOptions = {
            run: { module: serverModule, transport: TransportKind.ipc },
            debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
        }

        let clientOptions: LanguageClientOptions = {
            documentSelector: ['markdown', 'asciidoc'],
            synchronize: {
                configurationSection: 'vscode-journal',
                fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
            }
        }

        let disposable = new LanguageClient('vscode-journal-client', 'VSCode-Journal Client', serverOptions, clientOptions).start();
        this.context.subscriptions.push(disposable);

        console.log("vscode-journal Language Server started");
    }


}




// this method is called when your extension is deactivated
export function deactivate() {

}

