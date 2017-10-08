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
import * as os from 'os'
import * as Path from 'path';
import * as fs from 'fs';
import * as Q from 'q';
import * as util from './util'; 

export class TemplateInfo {
    constructor(public Template: string, public After: string) { }
}

/**
 * All config parameters in one place
 */
export class Configuration {

    private inlineTemplates: any = null;

    constructor(public config: vscode.WorkspaceConfiguration) {

    }



    public getLocale(): string {
        let locale: string = this.config.get<string>('locale');
        return (locale.length > 0) ? locale : 'en-US';
    }

    public isOpenInNewEditorGroup(): boolean {
        return this.config.get<boolean>('openInNewEditorGroup');
    }

    public isDevEnabled(): boolean {
        let dev: boolean = this.config.get<boolean>('dev');
        return (dev) ? dev : false;
    }

    public getBasePath(): string {

        let base = this.config.get<string>('base');

        if (base.length > 0) {
            return Path.resolve(base);
        } else {
            // let's default to home directory
            return Path.resolve(os.homedir(), "Journal");
        }
    }


    public getConfigPath(): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer();

        let configDir = this.config.get<string>('extDir');

        if (configDir != null && configDir.length > 0) {
            configDir = Path.resolve(configDir);
        } else {
            // default is .vscode in base (we want this folder to be synced)
            configDir = Path.resolve(this.getBasePath(), ".vscode");
        }


        util.checkIfFileIsAccessible(configDir)
            .catch((err) => {
                return Q.nfcall(fs.mkdir, configDir)
            })
            .then(() => {
                // check if page template is there
                let filePath: string = Path.join(configDir, "journal.page-template.md");
                return util.checkIfFileIsAccessible(filePath);
            })
            .catch((err) => {
                // template not there, copy from extension directory
                return this.initializeConfigDir(configDir);
            })
            .then(() => {
                deferred.resolve(configDir);
            })
            .catch((err) => {
                deferred.reject("Failed to initialize the configuration: " + err);
            })
            .done();


        return deferred.promise;
    }

    private initializeConfigDir(configDir: string): Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer();

        let ext: vscode.Extension<any> = vscode.extensions.getExtension("pajoma.vscode-journal");
        let source: string = Path.resolve(ext.extensionPath, "res", "configs");

        Q.all([
            this.copyTask(source, configDir, "settings.json"),
            this.copyTask(source, configDir, "journal.page-template.md"),
            this.copyTask(source, configDir, "journal.note-template.md"),
            this.copyTask(source, configDir, "journal.inline-templates.json"),
        ]
        )
            .then(() => deferred.resolve(null))
            .catch((err) => deferred.reject("Error copying: " + err));

        return deferred.promise;


    }



    // defaults to md
    public getFileExtension(): string {
        let ext: string = this.config.get<string>('ext');
        if (ext.startsWith(".")) ext = ext.substring(1, ext.length);
        return (ext.length > 0) ? ext : 'md';
    }

    private configFiles: Map<string,  {detail: string, filename: string}> = null; 
    public getConfigFileDefinitions(): Map<string, {detail: string, filename: string}> {
        if(this.configFiles == null) {
            this.configFiles = new Map();
            this.configFiles.set("tpl.entry", {detail: "Template for journal entries", filename: "journal.page-template.md" }); 
            this.configFiles.set("tpl.note", {detail: "Template for notes", filename: "journal.note-template.md" }); 
            this.configFiles.set("json.templates", {detail: "Inline templates", filename: "journal.inline-templates.json" }); 

            
        }

        return this.configFiles; 


    }

    /**
     * Load the page template from the resource directory (in .vscode in workspace)
     */
    public getJournalEntryTemplate(): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer();

        this.getConfigPath()
            .then(configPath => Q.nfcall(fs.readFile, Path.join(configPath, this.getConfigFileDefinitions().get("tpl.entry").filename), "utf-8"))
            .then((data: Buffer) => deferred.resolve(data.toString()))
            .catch((reason: any) => deferred.reject("Failed to get page template. Reason: " + reason));
        return deferred.promise;
    }


    public getNotesTemplate(): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer();

        this.getConfigPath()
            .then(configPath => Q.nfcall(fs.readFile, Path.join(configPath, this.getConfigFileDefinitions().get("tpl.note").filename), "utf-8"))
            .then((data: Buffer) => deferred.resolve(data.toString()))
            .catch((reason: any) => deferred.reject("Failed to get note template. Reason: " + reason));
        return deferred.promise;
    }

    private getInlineTemplates(): Q.Promise<any> {
        let deferred: Q.Deferred<string> = Q.defer();


        this.getConfigPath()
            .then(configPath => Q.nfcall(fs.readFile, Path.join(configPath,this.getConfigFileDefinitions().get("json.templates").filename), "utf-8"))
            .then((data: Buffer) => {
                this.inlineTemplates = JSON.parse(data.toString());
                deferred.resolve(this.inlineTemplates);
            })
            .catch((reason: any) => deferred.reject("Failed to get configuration of inline templates. Reason: " + reason));
        return deferred.promise;
    }

    public getMemoTemplate(): Q.Promise<TemplateInfo> {
        let deferred: Q.Deferred<TemplateInfo> = Q.defer();

        this.getInlineTemplates()
            .then(val => {
                let template = val["memo"]["template"];
                let placeholder = val["memo"]["after"];

                deferred.resolve(new TemplateInfo(template, placeholder));
            });
        return deferred.promise;
    }

    public getFileLinkTemplate(): Q.Promise<TemplateInfo> {
        let deferred: Q.Deferred<TemplateInfo> = Q.defer();

        this.getInlineTemplates()
            .then(val => {
                let template = val["file"]["template"];
                let placeholder = val["file"]["after"];

                deferred.resolve(new TemplateInfo(template, placeholder));
            });
        return deferred.promise;
    }
 
    public getTaskTemplate():  Q.Promise<TemplateInfo> {
        let deferred: Q.Deferred<TemplateInfo> = Q.defer();

        this.getInlineTemplates()
            .then(val => {
                let template = val["task"]["template"];
                let placeholder = val["task"]["after"];

                deferred.resolve(new TemplateInfo(template, placeholder));
            });
        return deferred.promise;

    }
    public getTodoTemplate() {
        return new TemplateInfo(this.config.get<string>('tpl-todo'), this.config.get<string>('tpl-todo-after'));
    }



 
    /**
     * Copy files from target to source directory (used to initialize configuration directory)
     * 
     * @param source Source Directory
     * @param target Target Directory
     * @param file  File to copy
     */
    private copyTask(source, target, file): Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer();

        Q.fcall(() => {
            fs.createReadStream(Path.join(source, file)).pipe(fs.createWriteStream(Path.join(target, file)));
            deferred.resolve(null);
        });

        // copy everything in there to configDir
        // fs.createReadStream('test.log').pipe(fs.createWriteStream('newLog.log'));

        return deferred.promise;
    }
}