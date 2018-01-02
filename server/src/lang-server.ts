import { log } from 'util';
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument,
	Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem,
	CompletionItemKind, Range, Position, TextEdit, RemoteWorkspace, RequestHandler, CodeActionParams, Command
} from 'vscode-languageserver';
import { Capabilities } from "./";



// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));


// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();



// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	workspaceRoot = params.rootPath;
	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			codeActionProvider: true,
			executeCommandProvider: {
				commands: ["journal.completeTask", "journal.shiftTask", "journal.uncompleteTask"]
			}
			//,codeActionProvider: true
		}
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.







// The settings interface describe the server relevant settings part
interface Settings {
	lspSample: ExampleSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;
// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	let settings = <Settings>change.settings;
	maxNumberOfProblems = 100;
	// Revalidate any open text documents
	documents.all().forEach(validateTextDocument);
});

function validateTextDocument(textDocument: TextDocument): void {


}


connection.onDidChangeWatchedFiles((_change) => {
	// Monitored files have change in VSCode
	connection.console.log('We recevied an file change event');
});




/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/


let codeActionsProvider: Capabilities.CodeActions = new Capabilities.CodeActions(connection, documents);


// Listen on the connection
connection.listen();



// https://code.visualstudio.com/docs/extensionAPI/language-support
// connection.onCodeAction()
/*
connection.onCodeAction(handler : RequestHandler<CodeActionParams, Command[],void) ): void {

}

connection.onCodeAction(async (param) => {
     connection.console.log('onCodeAction'+	JSON.stringify(param))
   
    return []
})*/