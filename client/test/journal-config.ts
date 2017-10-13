'use strict';
import * as assert from 'assert';
import * as J from '../src/'; 

import * as vscode from 'vscode';
import * as journalExtension from '../src/extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Access Journal Configuration", () => {
    let wsConfig: vscode.WorkspaceConfiguration;  
    let config:J.Commons.Configuration; 

    test("Activate Journal", () => {
        wsConfig = vscode.workspace.getConfiguration("journal");
        config = new J.Commons.Configuration(wsConfig); 
    })

    test("Load the page template", () => {
        return config.getJournalEntryTemplate().then( (tpl) => {
            assert.notEqual(0, tpl.length); 
        });  
    });

    test("Loading memo template", () => {
        return config.getMemoTemplate().then( (tplInfo) => {
            assert.notEqual(0, tplInfo.template.length); 
        }); 
    }); 

    test("Loading notes template", () => {
        return config.getFileLinkTemplate().then( (tplInfo) => {
            assert.notEqual(0, tplInfo.template.length); 
        }); 
    }); 

   


    
});
