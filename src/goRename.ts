/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import cp = require('child_process');
import { getBinPath } from './goPath';
import { byteOffsetAt, canonicalizeGOPATHPrefix } from './util';
import { promptForMissingTool } from './goInstallTools';

export class GoRenameProvider implements vscode.RenameProvider {

	public provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): Thenable<vscode.WorkspaceEdit> {
		return vscode.workspace.saveAll(false).then(() => {
			return this.doRename(document, position, newName, token);
		});
	}

	private doRename(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): Thenable<vscode.WorkspaceEdit> {
		return new Promise<vscode.WorkspaceEdit>((resolve, reject) => {
			let filename = canonicalizeGOPATHPrefix(document.fileName);
			let range = document.getWordRangeAtPosition(position);
			let pos = range ? range.start : position;
			let offset = byteOffsetAt(document, pos);

			let gorename = getBinPath('gorename');
			let buildTags = '"' + vscode.workspace.getConfiguration('go')['buildTags'] + '"';

			cp.execFile(gorename, ['-offset', filename + ':#' + offset, '-to', newName, '-tags', buildTags], {}, (err, stdout, stderr) => {
				try {
					if (err && (<any>err).code === 'ENOENT') {
						promptForMissingTool('gorename');
						return resolve(null);
					}
					if (err) return reject('Cannot rename due to errors: ' + stderr);
					// TODO: 'gorename' makes the edits in the files out of proc.
					// Would be better if we could get the list of edits.
					return resolve(new vscode.WorkspaceEdit());
				} catch (e) {
					reject(e);
				}
			});
		});
	}

}
