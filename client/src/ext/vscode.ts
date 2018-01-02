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

'use strict';

import * as vscode from 'vscode';
import * as Q from 'q';
import * as Path from 'path';
import * as J from './..'

/** 
 * Anything which extends Visual Studio Code goes here 
 * 
 */
export class VSCode {
    constructor(public config: J.Commons.Configuration, public writer: J.Actions.Writer) {

    }

    /** 
     * Simple method to have Q Promise for vscode API call to get user input 
     */
    public getUserInput(tip: string): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer<string>();

        let options: vscode.InputBoxOptions = {
            prompt: tip
        };

        vscode.window.showInputBox(options)
            .then((value: string) => {
                if (value && value.length > 0) {
                    deferred.resolve(value);
                } else {
                    // user canceled
                    deferred.reject("cancel");
                }


            });

        return deferred.promise;
    }

    /**
     * Shows a pick list with all config files which a user can edit. Returns the full path to the selected config file. 
     */
    public pickConfigToEdit(): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer<string>();

        Q.fcall(() => {
            let options: vscode.QuickPickOptions = {
                placeHolder: "Choose a template or config file you want to edit: "
            }

            let map: Map<string, string> = new Map();
            this.config.getConfigFileDefinitions().forEach((val, key) => {
                map.set(val.detail, val.filename);
            });

            vscode.window.showQuickPick(Array.from(map.keys()), options)
                .then((picked) => {
                    if (!picked) deferred.reject("cancel");

                    this.config.getTemplatesDirectory()
                        .then((path) => {
                            deferred.resolve(Path.join(path, map.get(picked)));
                        });
                });
        });

        return deferred.promise;
    }

    public getUserInputCombo(tip: string, items: Q.Promise<[J.Model.PickDayItem]>): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer<string>();

        let options: vscode.QuickPickOptions = {
            placeHolder: tip
        }

        console.log(JSON.stringify(items));


        vscode.window.showQuickPick(items, options)
            .then((picked: J.Model.PickDayItem) => {
                if (picked) {
                    deferred.resolve(picked.label);
                } else {
                    // user canceled
                    deferred.reject("cancel");
                }
            });

        return deferred.promise;
    }

    public getUserInputComboSync(tip: string, items: [J.Model.PickDayItem]): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer<string>();

        let options: vscode.QuickPickOptions = {
            placeHolder: tip

        }


        vscode.window.showQuickPick(items, options)
            .then((picked: J.Model.PickDayItem) => {
                if (picked) {
                    deferred.resolve(picked.label);
                } else {
                    // user canceled
                    deferred.reject("cancel");
                }
            });

        return deferred.promise;
    }


    /**
     * Creates a new file and adds the given content
     */
    public createSaveLoadTextDocument(path: string, content: string): Q.Promise<vscode.TextDocument> {
        var deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();



        let uri: vscode.Uri = vscode.Uri.parse('untitled:' + path);
        vscode.workspace.openTextDocument(uri)
            .then((doc: vscode.TextDocument) => this.writer.writeHeader(doc, content))
            .then((doc: vscode.TextDocument) => {
                if (doc.isUntitled) {
                    // open it again, this time not as untitled (since it has been saved)
                    vscode.workspace.openTextDocument(vscode.Uri.file(path))
                        .then(deferred.resolve)
                } else {
                    deferred.resolve(doc);
                }
                
                // console.log('[Journal]', 'Created file: ', doc.uri.toString());
            },
            failed => {
                console.error("[Journal] Failed to create file: ", uri.toString(), failed);
                deferred.reject(failed);
            }
            );

        return deferred.promise;
    }

    /**
     * Loads a text document from the given path
     */
    public loadTextDocument(path: string): Q.Promise<vscode.TextDocument> {
        var deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();
        let uri = vscode.Uri.file(path);
        try {
            vscode.workspace.openTextDocument(uri).then(
                success => {
                    deferred.resolve(success)
                },
                failed => {
                    deferred.reject(path) // return path to reuse it later in createDoc     
                }
            );
        } catch (error) {
            deferred.reject(path);
        }


        return deferred.promise;
    }



    public showDocument(textDocument: vscode.TextDocument): Q.Promise<vscode.TextEditor> {
        var deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();

        if (textDocument.isDirty) textDocument.save();

        let col = this.config.isOpenInNewEditorGroup() ? 2 : 1;

        vscode.window.showTextDocument(textDocument, col, false).then(
            view => {
                console.log("[Journal]", "Showed file:", textDocument.uri.toString());

                deferred.resolve(view);
            }, failed => {
                deferred.reject("Failed to show text document");
            });

        return deferred.promise;
    }

}