'use strict';
import { log } from 'util';
import * as assert from 'assert';
import * as J from '../src/';

import * as vscode from 'vscode';
import * as journalExtension from '../src/extension';

suite("Access Journal Configuration", () => {
    let wsConfig: vscode.WorkspaceConfiguration;
    let config: J.Commons.Configuration;





    test("Activate", () => {
        // journalExtension.activate(vscode.extensions.)

        wsConfig = vscode.workspace.getConfiguration("journal");
        assert.ok(wsConfig.get("base")); 
        assert.ok(wsConfig.get("templates-directory")); 

        // journal.base has to be set in test workspace settings, we cannot set them dynamically

        // vscode.extensions.all.forEach((ext) => { console.log(ext.id) })

        config = new J.Commons.Configuration(wsConfig);

        assert.ok(config); 
    })

    test("Loading journal entry template", () => {
        return config.getJournalEntryTemplate().then((tpl) => {
            assert.notEqual(0, tpl.length);
        });
    });

    test("Loading memo template", () => {
        return config.getMemoTemplate().then((tplInfo) => {
            assert.notEqual(0, tplInfo.template.length);
        });
    });

    test("Loading notes template", () => {
        return config.getFileLinkTemplate().then((tplInfo) => {
            assert.notEqual(0, tplInfo.template.length);
        });
    });

    test("Getting file pattern for notes", () => {
        return config.getNotesFilePattern().then((pattern) => {
            assert.notEqual(0, pattern.length);
        });
    });

    test("Getting path for notes", () => {
        return config.getNotesPathPattern().then((pattern) => {
            assert.notEqual(0, pattern.length);
        });
    });

});
