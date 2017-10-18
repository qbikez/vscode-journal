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
import * as J from './';
import * as moment from 'moment';

export interface Journal {
    createJournalNote(path: string): Thenable<vscode.TextDocument>
    injectInput(input: J.Model.Input, document: vscode.TextDocument): Thenable<vscode.TextDocument>

    getConfig(): J.Commons.Configuration
    getJournalWriter(): J.Actions.Writer
    getJournalParser(): J.Actions.Parser
    getJournalReader(): J.Actions.Reader
    getVSCAdapter(): J.Extension.VSCode

    loadPageForInput(inputStr: string);
}





/**
 * Encapsulates everything needed for the Journal extension. 
 */
export class JournalMain implements Journal {
    private config: J.Commons.Configuration;
    private parser: J.Actions.Parser;
    private writer: J.Actions.Writer;
    private vsExt: J.Extension.VSCode;
    private reader: J.Actions.Reader;


    constructor(private vscodeConfig: vscode.WorkspaceConfiguration) {

    }


    public loadPageForInput(inputString: string): Q.Promise<vscode.TextDocument> {

        let deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();
        let input: J.Model.Input;

        this.getJournalParser().tokenize(inputString)
            .then((_input: J.Model.Input) => {
                input = _input;
                return this.loadPageForOffset(input.offset);
            })
            .then((doc: vscode.TextDocument) => {
                return this.injectInput(input, doc);
            })
            .then((doc: vscode.TextDocument) => {
                deferred.resolve(doc)
            })
            .catch(error => deferred.reject(error));


        return deferred.promise;
    }





    /**
     * Returns the page for a day with the given offset. If the page doesn't exist yet, it will be created (with the current date as header) 
     * @param {number} offset - 0 is today, -1 is yesterday
     */
    public loadPageForOffset(offset: number): Q.Promise<vscode.TextDocument> {
        let deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();

        if (isNaN(offset)) deferred.reject("Journal: Not a valid value for offset");

        let date = new Date();
        date.setDate(date.getDate() + offset);


        J.Commons.getEntryPathForDate(date, this.getConfig().getBasePath(), this.getConfig().getFileExtension())
            .then((path: string) => {
                this.getVSCAdapter().loadTextDocument(path)
                    .then(deferred.resolve)
                    .catch(err => {
                        // failed to open text doc from url, create it
                        this.config.getJournalEntryTemplate()
                            .then((tpl: string) => {
                                let template: string = this.getConfig().getHeaderTemplate(); 
                                let content: string = J.Commons.formatDate(date, template, this.getConfig().getLocale())
                                return tpl.replace('${header}', content); 
                            })
                            .then((content) => {
                                return this.getVSCAdapter   ().createSaveLoadTextDocument(path, content)
                            })
                            .then((doc: vscode.TextDocument) => deferred.resolve(doc))
                            .catch(deferred.reject); 

                    });
            })
            
            .catch(err => deferred.reject(err));

        return deferred.promise;
    }

    /**
     * Creates a new file in a subdirectory with the current day of the month as name. 
     * Shows the file to let the user start adding notes right away. 
     */
    public createJournalNote(input: string): Q.Promise<vscode.TextDocument> {
        var deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();

        let content: string = null;

        this.getConfig().getNotesTemplate()
            .then((template: string) => {
                content = template.replace('${input}', input)
                return J.Commons.normalizeFilename(input);
            })
            .then((filename: string) => {
                return J.Commons.getFilePathInDateFolder(new Date(), filename, this.getConfig().getBasePath(), this.getConfig().getFileExtension());
            })
            .then((path: string) => {
                return this.getVSCAdapter().loadTextDocument(path);
            })
            .catch((filename: string) => {
                if (filename != "cancel") {
                    return this.getVSCAdapter().createSaveLoadTextDocument(filename, content);
                } else {
                    throw "cancel";
                }

            })
            .then((doc: vscode.TextDocument) => {
                deferred.resolve(doc);
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    /**
     * Adds a new memo to today's page. A memo is a one liner (entered in input box), 
     * which can be used to quickly write down ToDos without leaving your current 
     * document.
     */
    public injectInput(input: J.Model.Input, doc: vscode.TextDocument): Q.Promise<vscode.TextDocument> {
        var deferred: Q.Deferred<vscode.TextDocument> = Q.defer<vscode.TextDocument>();

        if (!input.hasMemo() || !input.hasFlags()) deferred.resolve(doc);
        else {
            this.getJournalWriter().writeInputToFile(doc, new vscode.Position(2, 0), input)
                .then(doc => deferred.resolve(doc))
                .catch((error) => deferred.reject(error));

        }
        return deferred.promise;

    }




    /**
     * Configuration parameters for the Journal Extension
     */
    public getConfig(): J.Commons.Configuration {
        if (!this.config) this.config = new J.Commons.Configuration(this.vscodeConfig);
        return this.config;
    }

    public getVSCAdapter(): J.Extension.VSCode {
        if (!this.vsExt) this.vsExt = new J.Extension.VSCode(this.getConfig(), this.getJournalWriter());
        return this.vsExt;
    }

    public getJournalWriter(): J.Actions.Writer {
        if (!this.writer) this.writer = this.writer = new J.Actions.Writer(this.getConfig());
        return this.writer;
    }

    public getJournalParser(): J.Actions.Parser {
        if (!this.parser) this.parser = this.parser = new J.Actions.Parser(this.getConfig());
        return this.parser;
    }

    public getJournalReader(): J.Actions.Reader {
        if (!this.reader) this.reader = this.reader = new J.Actions.Reader(this.getConfig());
        return this.reader;
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

    public synchronizeReferencedFiles(doc: vscode.TextDocument): void {
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



    /**
     * Displays a picklist of recent Journal pages (with number of open tasks and notes next to it). The user is still able to enter arbirtraty values. 
     * 
     * Not working yet (current API does not support combolists, it's either picklist or input box)
     
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
    */
}