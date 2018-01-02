//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as path from 'path';
import * as JournalServer from '..//src';

// Defines a Mocha test suite to group tests of similar kind together
suite("Journal Server Tests", () => {

    test("Starting the language server", () => {

    }); 

    // Defines a Mocha unit test
    test("Scanning the tasks file", () => {

        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });
});