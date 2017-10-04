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
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode-languageserver");
class JournalCompletions {
    /**
     *
     */
    constructor(connection, documents) {
        this.connection = connection;
        this.documents = documents;
        this.listen();
    }
    listen() {
        // This handler provides the initial list of the completion items.
        this.connection.onCompletion((_pos) => {
            // The pass parameter contains the position of the text document in 
            // which code complete got requested. For the example we ignore this
            // info and always provide the same completion items.
            // get text of line
            let doc = this.documents.get(_pos.textDocument.uri);
            // linenumber
            let lines = doc.getText().split(/\r?\n/g);
            let currentLine = lines[_pos.position.line];
            let exprString = "(\\*)\\s(\\[\\s{0,1}\\])\\s+(.+)";
            let expr = new RegExp(exprString);
            this.connection.console.log("Text at line " + _pos.position.line + " is: " + lines[_pos.position.line]);
            let replaceRange = vscode.Range.create(vscode.Position.create(_pos.position.line, 3), vscode.Position.create(_pos.position.line, 4));
            let completeEdit = vscode.TextEdit.replace(replaceRange, "x");
            let shiftEdit = vscode.TextEdit.replace(replaceRange, ">");
            if (expr.test(currentLine)) {
                this.connection.console.log("Match");
                return [
                    {
                        label: 'Mark complete',
                        sortText: "1",
                        textEdit: completeEdit,
                        kind: vscode.CompletionItemKind.Enum,
                        data: 1
                    },
                    {
                        label: 'Shift to tomorrow',
                        sortText: "2",
                        textEdit: shiftEdit,
                        kind: vscode.CompletionItemKind.Reference,
                        data: 2
                    }
                ];
            }
            else
                this.connection.console.log("No match");
            /*
            connection.console.log("Text at line "+_textDocumentPosition.position.line+" is: "+ lines[_textDocumentPosition.position.line]);
        
            let offset = doc.offsetAt(_textDocumentPosition.position);
            connection.console.log("Char at offset "+offset+" is: "+ doc.getText().charAt(offset));
        
            let line = doc.getText().slice(offset, 100);
            connection.console.log("The line at offset "+offset+" is: "+ line);
            */
        });
        // This handler resolve additional information for the item selected in
        // the completion list.
        this.connection.onCompletionResolve((item) => {
            if (item.data === 1) {
                item.detail = 'Complete this task',
                    item.documentation = 'Marks this task as done.';
            }
            else if (item.data === 2) {
                item.detail = 'Shift this task to tomorrow.',
                    item.documentation = 'The task will be copied to tomorrows page';
            }
            return item;
        });
    }
}
exports.JournalCompletions = JournalCompletions;
//# sourceMappingURL=completions.js.map