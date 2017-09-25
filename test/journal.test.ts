'use strict';
import * as assert from 'assert';
import Journal from '../src/journal'; 
import * as jrn from '../src/util'; 

import * as vscode from 'vscode';
import * as journalExtension from '../src/extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Journal Unit Tests", () => {
    let wsConfig: vscode.WorkspaceConfiguration;  


    test("Activate Journal", () => {
        wsConfig = vscode.workspace.getConfiguration("journal");
    })

    test("Load the page template", () => {
        let config:jrn.Configuration = new jrn.Configuration(wsConfig); 
        return config.getPageTemplate().then( (tpl) => {
            assert.notEqual(0, tpl.length); 
            console.log(tpl);
            
        });  
    });

    test("Loading Templates", () => {
        let config:jrn.Configuration = new jrn.Configuration(wsConfig); 

        let param: string = config.getMemoTemplate(); 
        assert.notEqual(0, param.length);


        let info: jrn.TemplateInfo  = config.getNotesTemplate(); 
        assert.notEqual(null, info);

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
       
        let config:jrn.Configuration = new jrn.Configuration(wsConfig); 
        let util:jrn.Util = new jrn.Util(null); 
        let parser:jrn.Parser = new jrn.Parser(config, util);           


        parser.resolveOffset("-1").then(offset => {
            let date = new Date(); 
            date.setDate(date.getDate()+offset[0]);
            let res = util.formatDate(date); 

            console.log("Offset is "+util.formatDate(date));
            assert.equal(true, res.length>0);
             
        }, err => {
            assert.fail; 
        }); 
    }) 


    
});
