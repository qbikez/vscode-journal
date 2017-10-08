
// Copyright (C) 2016  Patrick Maué
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

import * as vscode from 'vscode';
import * as path from 'path';
import * as Q from 'q';
import * as J from '../.';
import * as fs from 'fs';
import * as Path from 'path';

export class TasksView implements vscode.TreeDataProvider<TaskInView> {

    private root: TaskInView;
    private tasks: TaskInView[];

    /**
     *
     */
    constructor(public config: J.Commons.Configuration) {
        this.tasks = [];


    }

    public init(): Q.Promise<void> {
        var deferred: Q.Deferred<void> = Q.defer<void>();

        this.checkIfTaskFilePresent(this)
            .then(this.observeTaskFile)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    parseTaskFile(): Q.Promise<void> {
        var deferred: Q.Deferred<void> = Q.defer<void>();

        return deferred.promise;
    }

    checkIfTaskFilePresent(_view: TasksView): Q.Promise<boolean> {
        var deferred: Q.Deferred<boolean> = Q.defer<boolean>();

        this.config.getConfigPath()
            .then(configPath => J.Commons.checkIfFileIsAccessible(Path.join(configPath, "tasks.json")))
            .then(() => deferred.resolve(true))
            .catch(error => {
                // tasks are created server side, we do nothing besides init
                _view.root = new TaskInView("Tasks View Root Node", "", null);
                _view.tasks.push(new TaskInView("Error: Server not running", "", null));
                deferred.resolve(false); 
            })
            .catch(deferred.reject);




        return deferred.promise;
    }


    observeTaskFile(taskFilePresent: boolean): Thenable<void> {
        var deferred: Q.Deferred<void> = Q.defer<void>();

        if(!taskFilePresent) deferred.resolve(null); 
        else {
            this.config.getConfigPath()
            .then(configPath => Q.nfcall(fs.readFile, Path.join(configPath, "tasks.json"), "utf-8"))
            .catch(error => {

            });
        }

 

        return deferred.promise;
    }

    getTreeItem(item: TaskInView): vscode.TreeItem {
        return new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);

        /* 
        let valueNode = node.parent.type === 'array' ? node : node.children[1];
		let hasChildren = (node.parent.type === 'array' && !node['arrayValue']) || valueNode.type === 'object' || valueNode.type === 'array';
		let treeItem: vscode.TreeItem = new vscode.TreeItem(this.getLabel(node), hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		treeItem.command = {
			command: 'extension.openJsonSelection',
			title: '',
			arguments: [new vscode.Range(this.editor.document.positionAt(node.offset), this.editor.document.positionAt(node.offset + node.length))]
		};
		treeItem.iconPath = this.getIcon(node);
        treeItem.contextValue = this.getNodeType(node);
        
        return treeItem;
        */
    }

    /**
     * Tasks don't have children (besides the root node)
     * @param node 
     */
    getChildren(node?: TaskInView): Thenable<TaskInView[]> {
        if (node) {
            // do nothing
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.root ? this.tasks : []);
        }
    }
}


/**
 * Simple model to hold the task info
 */
export class TaskInView {
    constructor(public label: string, public state: string, public creationDate: Date) { }
}