'use strict';
import * as console from 'console';
import * as assert from 'assert';
import * as J from '../src/';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as journalExtension from '../src/extension';

suite("Test Journal Notes", () => {
    let wsConfig: vscode.WorkspaceConfiguration;
    let config: J.Commons.Configuration;
    let parser: J.Actions.Parser;


    test("Activate", () => {
        wsConfig = vscode.workspace.getConfiguration("journal");
        config = new J.Commons.Configuration(wsConfig);
        parser = new J.Actions.Parser(config);
    })

    test("Create notes with input \"This is a note\"", () => {
        let journal = new J.JournalMain(wsConfig);

        return journal.createJournalNote("This is a note")
            .then(
                doc => assert.notEqual(0, doc.uri.path),
                error => assert.fail(error, null)
            ); 
    });

    test("Create notes with input \"tomorrow this is a note\"", () => {
        let journal = new J.JournalMain(wsConfig);

        return journal.createJournalNote("This is a note")
            .then(doc => journal.getJournalWriter().saveDocument(doc))
            .then(
                (doc: vscode.TextDocument)  => {
                    console.log(doc.uri);
                    console.log(doc.uri.path);
                    
                    assert.notEqual(0, doc.uri.path); 

                    fs.accessSync(doc.uri.fsPath); 

                }, 
                error => assert.fail(error, null)
            )
            .catch(error => {throw error}); 
    });
});
