'use strict';
import { resolve } from 'url';
import { randomBytes } from 'crypto';
import { log } from 'util';
import * as assert from 'assert';
import * as J from '../src/';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as journalExtension from '../src/extension';

suite("Test Journal Inputs", () => {
    let wsConfig: vscode.WorkspaceConfiguration;
    let config: J.Commons.Configuration;
    let parser: J.Actions.Parser;


    test("Activate", () => {
        wsConfig = vscode.workspace.getConfiguration("journal");
        config = new J.Commons.Configuration(wsConfig);
        parser = new J.Actions.Parser(config);
    })

    test("Open Yesterday", () => {
        let journal = new J.JournalMain(wsConfig);
        let offset: number = -1;

        return journal.loadPageForInput(offset.toString())
            .then(
            (doc: vscode.TextDocument) => {
                assert.notEqual(0, doc.uri.path);
                assert.ok(doc.getText().length > 0, "Header is" + doc.getText())
            },
            error => {
                throw (error);
            });
    });

    test("Test input \"22-12\"", () => {
        let journal = new J.JournalMain(wsConfig);
        return journal.loadPageForInput("22-12")
            .then(
            (doc: vscode.TextDocument) => {
                assert.fail(doc, null);
            },
            error => {
                assert.ok(error, "This is a message");
            });
    });

    test("Test input \"task do this today\"", () => {
        let journal = new J.JournalMain(wsConfig);

        let taskStr = "task let's do this today";

        return journal.loadPageForInput(taskStr)
            .then(
                doc => assert.notEqual(0, doc.uri.path),
                error => assert.fail(error, null)
            );
    });



    test("Test input \"+25\"", () => {



        parser.resolveOffset("+25").then(offset => {
            let date = new Date();
            date.setDate(date.getDate() + offset[0]);
            let res = J.Commons.formatDate(date, config.getHeaderTemplate(), config.getLocale());

            assert.equal(true, res.length > 0);

        }, err => {
            assert.fail;
        });
    })

    test("Test input \"mon\"", () => {
        let journal = new J.JournalMain(wsConfig);

        return journal.loadPageForInput("last monday")
        .then(
            doc => assert.notEqual(0, doc.uri.path),
            error => assert.fail(error, null)
        );
    })

});
