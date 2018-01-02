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

import { WorkspaceEdit, TextDocumentEdit, TextDocument, TextEdit } from 'vscode-languageserver';
export type CommandDefinition = { id: string, label: string, action: any }

export class WorkspaceUpdates implements WorkspaceEdit {
    documentChanges?: TextDocumentEdit[];

    constructor() {
        this.documentChanges = [];
    }

    public addDocumentUpdate(document: TextDocument, edit: TextEdit[]) {
        this.documentChanges.push(TextDocumentEdit.create(document, edit));
    }

}
