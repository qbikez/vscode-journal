'use strict';
import * as assert from 'assert';
import * as J from '../src/'; 

import * as vscode from 'vscode';
import * as journalExtension from '../src/extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Journal Unit Tests", () => {
    let wsConfig: vscode.WorkspaceConfiguration;  


    test("Activate Journal", () => {
        wsConfig = vscode.workspace.getConfiguration("journal");
    })

    test("Load the page template", () => {
        let config:J.Commons.Configuration = new J.Commons.Configuration(wsConfig); 
        return config.getPageTemplate().then( (tpl) => {
            assert.notEqual(0, tpl.length); 
        });  
    });

    test("Loading memo template", () => {
        let config:J.Commons.Configuration = new J.Commons.Configuration(wsConfig); 

        return config.getMemoTemplate().then( (tplInfo) => {
            assert.notEqual(0, tplInfo.Template.length); 
        }); 
    }); 

    test("Loading notes template", () => {
        let config:J.Commons.Configuration = new J.Commons.Configuration(wsConfig); 

        return config.getFileLinkTemplate().then( (tplInfo) => {
            assert.notEqual(0, tplInfo.Template.length); 
        }); 
    }); 

    /*
    test("open weekday (\"last wednesday\")", done => {
        var journal:Journal = new Journal(null);

        journal.resolveOffset("next wednesday").then(offset => {

            done(); 
        }); 


    })
    */

    test("open weekday (\"-1\")", () => {
       
        let config:J.Commons.Configuration = new J.Commons.Configuration(wsConfig); 
        let parser:J.Actions.Parser = new J.Actions.Parser(config);           


        parser.resolveOffset("-1").then(offset => {
            let date = new Date(); 
            date.setDate(date.getDate()+offset[0]);
            let res = J.Commons.formatDate(date); 

            console.log("Offset is "+J.Commons.formatDate(date));
            assert.equal(true, res.length>0);
             
        }, err => {
            assert.fail; 
        }); 
    }) 


    
});
