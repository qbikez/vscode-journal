'use strict';
import * as assert from 'assert';
import * as J from '../src/'; 

import * as vscode from 'vscode';
import * as journalExtension from '../src/extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Test Journal Inputs", () => {
    let wsConfig: vscode.WorkspaceConfiguration;  
    let config:J.Commons.Configuration; 
    let parser:J.Actions.Parser;    

    
    test("Activate Journal", () => {
        wsConfig = vscode.workspace.getConfiguration("journal");
        config  = new J.Commons.Configuration(wsConfig); 
        parser = new J.Actions.Parser(config);     
    })


    test("open (\"-1\")", () => {

        parser.resolveOffset("-1").then(offset => {
            let date = new Date(); 
            date.setDate(date.getDate()+offset[0]);
            let res = J.Commons.formatDate(date, config.getJournalHeaderTemplate(), config.getLocale()); 

            assert.equal(true, res.length>0);
             
        }, err => {
            assert.fail; 
        }); 
    }) 


    
});
