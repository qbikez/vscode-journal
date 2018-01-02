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
import * as os from 'os';
import * as Path from 'path';
import * as fs from 'fs';
import * as Q from 'q';
import * as util from './util';

export const SCOPE_DEFAULT = "default";

type TemplateConfiguration = {
    scope: string,
    template: string,
    after: string
}

type FilePatternConfiguration = {
    scope: string,
    path: string,
    file: string
}

export class Configuration {
    constructor(public config: vscode.WorkspaceConfiguration) {

    }

    public getMemoTemplate(scopeId?: string): Q.Promise<string> {
        return Q.Promise<string>((resolve, reject) => {
            let result: string = this.getTemplateEntry(scopeId, "entry", "memo");
            (result.length > 0) ? resolve(result) : resolve("* ${input}\n");
        });
    }


    public getNotesTemplate(scopeId?: string): Q.Promise<string> {
        return Q.Promise<string>((resolve, reject) => {
            let result: string = this.getTemplateEntry(scopeId, "note");
            (result.length > 0) ? resolve(result) : resolve("# ${input}\n\n");
        });
    }

    public getJournalEntryTemplate(scopeId?: string): Q.Promise<string> {
        return Q.Promise<string>((resolve, reject) => {
            let result: string = this.getTemplateEntry(scopeId, "entry");
            return (result.length > 0) ? resolve(result) : resolve("# dddd, LL\n\n");
        });
    }

    public getEntryFilePattern(_scopeId?: string): Q.Promise<{path: string, file: string}> {
        return Q.Promise<{path: string, file: string}>((resolve, reject) => {

            let config: FilePatternConfiguration =  this.getFilePatternConfiguration(_scopeId, target); 
            resolve({path: config.path, file: config.file}); 

            //return (result.length > 0) ? resolve(result) : resolve("# dddd, LL\n\n");
        });



        this.getJournalConfig()
            .then(config => {
                let scope: ScopeConfiguration = findScope(config.scopes, _scopeId);
                try {
                    deferred.resolve(scope.note.file);
                } catch (error) {
                    deferred.resolve(findScope(config.scopes, SCOPE_DEFAULT).note.file);
                }
            })
            .catch(deferred.reject);

        return deferred.promise;
    }


    private getTemplateEntry(scopeId: string, ...scopeElements: string[]) {
        scopeId = (scopeId && scopeId.length > 0) ? scopeId : SCOPE_DEFAULT; 

        let result: string = this.config.get<TemplateConfiguration[]>("journal.templates").find(e => {
            let se = e.scope.split(".");
            if (se.length != scopeElements.length + 1) return false;
            if (se[0] != scopeId) return false;

            let equal = true;
            scopeElements.forEach((val, idx) => {
                equal = equal && (val === se[idx + 1])
            })

            return equal;

        }).template

        return (result.length > 0) ? result : "${input} \n \n";
    }

    
    private getFilePatternConfiguration(scopeId: string, target: string): FilePatternConfiguration {
        scopeId = (scopeId && scopeId.length > 0) ? scopeId : SCOPE_DEFAULT; 

        return this.config.get<FilePatternConfiguration[]>("journal.file-patterns").find(e => {
            let se = e.scope.split(".");
            if (se.length != 2) && ( (se[1] != "note") || se[1] != "entry") throw new Error("Invalid scope definition in file-patterns configuration: "+e.scope); 
            if ( (se[0] == scopeId) && (se[1] == target) ) return true; 
            return false; 
        }); 
    }


    public isDevelopmentModeEnabled(): boolean {
        let dev: boolean = this.config.get<boolean>('dev');
        return (dev) ? dev : false;
    }

    public isOpenInNewEditorGroup(): boolean {
        let dev: boolean = this.config.get<boolean>('openInNewEditorGroup');
        return (dev) ? dev : false;
    }

    public getLocale(): string {
        let locale: string = this.config.get<string>('locale');
        return (locale.length > 0) ? locale : 'en-US';
    }

    public getFileExtension(): string {
        let ext: string = this.config.get<string>('ext');
        if (ext.startsWith(".")) ext = ext.substring(1, ext.length);
        return (ext.length > 0) ? ext : 'md';
    }

    public getBasePath(): string {
        let base = this.config.get<string>('base');
        return (base.length > 0) ? Path.resolve(base) : Path.resolve(os.homedir(), "Journal");
    }


}