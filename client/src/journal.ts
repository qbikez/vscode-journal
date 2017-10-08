// Copyright (C) 2016  Patrick Maué
// 
// This file is part of vscode-Journal.
// 
// vscode-Journal is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// vscode-Journal is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with vscode-Journal.  If not, see <http://www.gnu.org/licenses/>.
// 


'use strict';

import * as vscode from 'vscode';
import * as Q from 'q';
import * as J from './'


/**
 * Encapsulates everything needed for the Journal extension. 
 */
export default class JournalMain {
    private config: J.Commons.Configuration;
    private parser: J.Actions.Parser;
    private writer: J.Actions.Writer;
    private vsExt: J.Extension.VSCode;
    private reader: J.Actions.Reader;


    constructor(private vscodeConfig: vscode.WorkspaceConfiguration) {
        this.config = new J.Commons.Configuration(vscodeConfig);
        this.parser = new J.Actions.Parser(this.config);
        this.writer = new J.Actions.Writer(this.config);
        this.reader = new J.Actions.Reader(this.config);
        this.vsExt = new J.Extension.VSCode(this.config, this.writer);
    }


    /**
     * Displays a picklist of recent Journal pages (with number of open tasks and notes next to it). The user is still able to enter arbirtraty values. 
     * 
     * Not working yet (current API does not support combolists, it's either picklist or input box)
     */
    public openDayByInputOrSelection(): Q.Promise<vscode.TextDocument> {
        let deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();


        this.gatherSelection()
            .then(items => {
                console.log(JSON.stringify(items));

                return this.vsExt.getUserInputComboSync("Enter day or memo (with flags)", items)
            }
            )
            .then((value: string) => this.parser.tokenize(value))
            .then((input: J.Model.Input) => this.getPageForDay(input.offset))
            .then((doc: vscode.TextDocument) => deferred.resolve(doc))
            .catch((err) => {
                if (err != 'cancel') {
                    let msg = 'Failed to translate input into action';
                    vscode.window.showErrorMessage(msg);
                    deferred.reject(msg)
                }
            });

        return deferred.promise;
    }


    public editTemplates(): Q.Promise<vscode.TextEditor> {
        let deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();
        this.vsExt.pickConfigToEdit()
            .then(filepath => this.vsExt.loadTextDocument(filepath))
            .then(document => this.vsExt.showDocument(document))
            .then(editor => deferred.resolve(editor))
            .catch(error => deferred.reject(error))

        return deferred.promise;
    }


    /**
     * Opens the editor for a specific day. Supported values are explicit dates (in ISO format),
     * offsets (+ or - as prefix and 0) and weekdays (next wednesday) 
     */
    public openDayByInput(): Q.Promise<vscode.TextEditor> {
        let deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();
        let inputVar: J.Model.Input = null;
        let docVar: vscode.TextDocument = null;

        this.vsExt.getUserInput("Enter day or memo (with flags) ")
            .then((value: string) => {
                return this.parser.tokenize(value)
            })
            .then((input: J.Model.Input) => {
                inputVar = input;
                return this.getPageForDay(input.offset)
            })
            .then((doc: vscode.TextDocument) => {
                return this.addMemo(inputVar, doc)
            })
            .then((doc: vscode.TextDocument) => {
                return this.vsExt.showDocument(doc)
            })
            .then((doc: vscode.TextEditor) => {

                deferred.resolve(doc)
            })
            .catch((err) => {
                if (err != 'cancel') {
                    let msg = 'Failed to open page. Reason: \"' + err + "\"";
                    console.log(msg)
                    console.error(err);
                    vscode.window.showErrorMessage(msg);
                    deferred.reject(msg)
                }
            });

        return deferred.promise;
    }


    /**
     * Opens an editor for a day with the given offset. If the page doesn't exist yet, it will be created (with the current date as header) 
     * @param {number} offset - 0 is today, -1 is yesterday
     */
    public openDay(offset: number): Q.Promise<vscode.TextEditor> {
        var deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();

        this.getPageForDay(offset)
            .then(this.vsExt.showDocument)
            .then(deferred.resolve)
            .catch((err) => {
                let msg = 'Failed to open today\'s page. Reason: ' + err;
                vscode.window.showErrorMessage(msg);
                deferred.reject(msg)
            })

            ;
        return deferred.promise;
    }


    /**
     * Returns the page for a day with the given offset. If the page doesn't exist yet, it will be created (with the current date as header) 
     * @param {number} offset - 0 is today, -1 is yesterday
     */
    public getPageForDay(offset: number): Q.Promise<vscode.TextDocument> {
        let deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();

        if (isNaN(offset)) deferred.reject("Journal: Not a valid value for offset");

        let date = new Date();
        date.setDate(date.getDate() + offset);


        J.Commons.getEntryPathForDate(date, this.config.getBasePath(), this.config.getFileExtension())
            .then((path: string) => {
                return this.vsExt.loadTextDocument(path)
            })

            .catch((path: string) => {
                let deferred: Q.Deferred<vscode.TextDocument> = Q.defer();

                let date = new Date();
                date.setDate(date.getDate() + offset);

                this.config.getJournalEntryTemplate()
                    .then((tpl: string) => tpl.replace('{header}', J.Commons.formatDate(date, this.config.getLocale())))
                    .then((content) => this.vsExt.createSaveLoadTextDocument(path, content))
                    .then((doc: vscode.TextDocument) => deferred.resolve(doc));

                return deferred.promise;

            })

            .then((doc: vscode.TextDocument) => {
                if (this.config.isDevEnabled()) console.log("[Journal]", "Loaded file:", doc.uri.toString());
                this.synchronizeReferencedFiles(doc);
                deferred.resolve(doc);
            })

            .catch(reason => {
                console.error("[Journal]", "Failed to get file, Reason: ", reason);
                deferred.reject("Failed to open file");
            })




        return deferred.promise;
    }

    /**
     * Creates a new file in a subdirectory with the current day of the month as name. 
     * Shows the file to let the user start adding notes right away. 
     */
    public createNote(): Q.Promise<vscode.TextEditor> {
        var deferred: Q.Deferred<vscode.TextEditor> = Q.defer<vscode.TextEditor>();

        // let content: string = this.config.getNotesPagesTemplate();
        let label: string;
        let content: string = null;

        this.config.getNotesTemplate()
            .then(tplInfo => {
                content = tplInfo;
                return this.vsExt.getUserInput("Enter name for your notes");
            })
            .then((input: string) => {
                label = input;
                content = content.replace('{content}', input)
                return J.Commons.normalizeFilename(input);
            })
            .then((filename: string) => {
                return J.Commons.getFilePathInDateFolder(new Date(), filename, this.config.getBasePath(), this.config.getFileExtension());
            })
            .then((path: string) => {
                return this.vsExt.loadTextDocument(path);
            })
            .catch((filename: string) => {
                if (filename != "cancel") {
                    return this.vsExt.createSaveLoadTextDocument(filename, content);
                } else {
                    throw "cancel";
                }

            })
            .then((doc: vscode.TextDocument) => {
                /* add reference to today's page
                this.getPageForDay(0).then((pagedoc: vscode.TextDocument) => {
                    let folder: string = this.util.getFileInURI(pagedoc.uri.path); 
                    let file: string = this.util.getFileInURI(doc.uri.path, true); 

                    this.writer.insertContent(pagedoc, this.config.getNotesTemplate(),
                        ["{label}", label],
                        ["{link}", "./"+folder+"/"+file]
                    );
                }); 
                */


                return this.vsExt.showDocument(doc);
            })
            .then((editor: vscode.TextEditor) => {
                this.getPageForDay(0);  //triggeres synchronize of referenced files
                deferred.resolve(editor);
            })
            .catch((err) => {
                if (err != 'cancel') {
                    deferred.reject("Failed to create a new note. Reason is [" + err + "]");
                }
            });

        return deferred.promise;
    }

    /**
     * Adds a new memo to today's page. A memo is a one liner (entered in input box), 
     * which can be used to quickly write down ToDos without leaving your current 
     * document.
     */
    public addMemo(input: J.Model.Input, doc: vscode.TextDocument): Q.Promise<vscode.TextDocument> {
        var deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();

        if (!input.hasMemo() || !input.hasFlags()) deferred.resolve(doc);
        else {
            this.writer.writeInputToFile(doc, new vscode.Position(2, 0), input)
                .then(doc => deferred.resolve(doc))
                .catch(() => deferred.reject("Failed to add memo"));

        }
        return deferred.promise;

    }


    /**
     * Called by command 'Journal:open'. Opens a new windows with the Journal base directory as root. 
     * 
     * 
     */
    public openJournal(): Q.Promise<void> {
        var deferred: Q.Deferred<void> = Q.defer<void>();

        let path = vscode.Uri.file(this.config.getBasePath());
        vscode.commands.executeCommand('vscode.openFolder', path, true)
            .then(success => {
                deferred.resolve(null);
            },
            deferred.reject);

        return deferred.promise;
    }

    /**
     * Configuration parameters for the Journal Extension
     */
    public getConfig(): J.Commons.Configuration {
        return this.config;
    }





    /*********  PRIVATE METHODS FROM HERE *********/

    /** 
     * Opens a specific page depending on the input 

    private open(input: Journal.Input): Q.Promise<vscode.TextDocument> {
        var deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();

        if (input.hasMemo() && input.hasFlags()) {
            return this.addMemo(input);
        }

        if (input.hasOffset()) {
            return this.openDay(input.offset);
        }
        return deferred.promise;
    };     */


    /**
    < * Loads input selection (DEV feature)
     */
    private gatherSelection(): Q.Promise<[J.Model.PickDayItem]> {
        let deferred: Q.Deferred<[J.Model.PickDayItem]> = Q.defer<[J.Model.PickDayItem]>();

        let res: [J.Model.PickDayItem] = <[J.Model.PickDayItem]>new Array();
        this.reader.getPreviousJournalFiles()
            .then(files => {
                files.forEach(file => {
                    res.push(new J.Model.PickDayItem(file, "This is a generic desc"));
                });
                deferred.resolve(res);

            });

        this.reader.getPreviousJournalFiles();

        return deferred.promise;
    }

    private synchronizeReferencedFiles(doc: vscode.TextDocument): void {
        // we invoke the scan of the notes directory in paralell
        Q.all([
            this.reader.getReferencedFiles(doc),
            this.reader.getFilesInNotesFolder(doc)
        ]).then(results => {
            // for each file, check wether it is in the list of referenced files
            let referencedFiles: string[] = results[0];
            let foundFiles: string[] = results[1];

            foundFiles.forEach((file, index, array) => {
                let m: string = referencedFiles.find(match => match == file);
                if (m == null) {
                    if (this.config.isDevEnabled()) console.log("not present: " + file);
                    // construct local reference string
                    this.config.getFileLinkTemplate()
                        .then(tplInfo => {
                            this.writer.insertContent(doc, tplInfo,
                                ["{label}", J.Commons.denormalizeFilename(file, this.config.getFileExtension())],
                                ["{link}", "./" + J.Commons.getFileInURI(doc.uri.path) + "/" + file]
                            );
                        });



                }
            });

            console.log(JSON.stringify(results));
        }).catch((err) => {
            let msg = 'Failed to synchronize page with notes folder. Reason: ' + err;
            vscode.window.showErrorMessage(msg);
        })


    }
}