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
import { defer } from 'Q';

import * as Q from 'q';
import * as lsp from 'vscode-languageserver';
import * as J from '../.'
import * as Path from 'path';



export class Observer {

    constructor() {
        


    }

    public init(): void {
        // get path to config directory

        // load the tasks json, if it doesn't exist create it

        // if it exists, load json into type structure (array)

        // go back starting with last day of this week 

        // for each file check if it contains  tasks

        // for each open task, check if it exits in tasks.json

            // if not, add it to json

        // for each closed or shifted task, check if if is in tasks.json, if yes, remove it

    }


    public monitor(): void {
        // start monitoring
    }

}