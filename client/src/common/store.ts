import * as vscode from 'vscode';
import * as os from 'os';
import * as Path from 'path';
import * as fs from 'fs';
import * as Q from 'q';
import * as util from './util';
import { Configuration } from "./config";         

export class Storage {

    constructor( public config: Configuration) {
        
            }
            
        /**
     * Returns a valid path, replaces variables with their counterparts
     * @param pathStr 
     */
    private resolvePath(pathStr: string): string {
        let result: string = pathStr; 
        
        pathStr.match(/\$\{.+\}/).forEach((token:string) => {
            result = result.replace(token, this.replacePlaceholder(token)); 
        }); 

        return result; 

    }

    private replacePlaceholder(variableStr: string) {
        switch (variableStr) {
            case "${journalFolder}":
                return this.config.getBasePath();
            case "${date:}":
            default:
                throw new Error("Failed to susbstitute variable: " + variableStr);
        }
    }

    public getStorageDirectory(): Q.Promise<string> {
        let deferred: Q.Deferred<string> = Q.defer();
        Q.fcall(() => {
            
            // default is .vscode in base (we want this folder to be synced)
            let configDir = Path.resolve(this.config.getBasePath(), ".vscode");


            util.checkIfFileIsAccessible(configDir)
                .catch((err) => {
                    return Q.nfcall(fs.mkdir, configDir)
                })
                .then(() => {
                    deferred.resolve(configDir);
                })
                .catch((err) => {
                    deferred.reject("Failed to initialize the configuration: " + err);
                })
                .done();
        });



        return deferred.promise;
    }
}