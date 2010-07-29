#!/usr/bin/env node
/*
---
name : generateCompletions
description : generateCompletions generates Completions

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

requires :
- Node.js/require
- Node.js/process.env
- Node.js/sys
- Node.js/fs
- Suggestion
...
*/

var ROOT_DIR = process.env.TM_DIRECTORY || process.env.PWD;

var hasOwnProperty = {}.hasOwnProperty;

var sys = require('sys');
var fs = require('fs');

require.paths.unshift('./lib');

var completionArray = [];
// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

var API = JSON.parse(fs.readFileSync(ROOT_DIR + '/api.json'));

for (var namespace in API){
	if (!hasOwnProperty.call(API, namespace)) continue;
	
	completionArray.push(namespace)
	completionArray.push(namespace.replace('tanium',''))
	
	for (var i = 0; i < API[namespace].methods.length; ++i){
		completionArray.push(API[namespace].methods[i].name+'()')
		completionArray.push(namespace + '.' + API[namespace].methods[i].name+'()')
		completionArray.push(namespace.replace('tanium','') + '.' + API[namespace].methods[i].name+'()')
	}
	
	for (var i = 0; i < API[namespace].properties.length; ++i){
		completionArray.push(API[namespace].properties[i].name)
		completionArray.push(namespace + '.' + API[namespace].properties[i].name)
		completionArray.push(namespace.replace('tanium','') + '.' + API[namespace].properties[i].name)
	}
}

var cobj = {}
for (var i = -1, l=completionArray.length; i < l; ++i){
	cobj[completionArray[i]] = true
}
completionArray = Object.keys(cobj)
completionArray.sort()

sys.p(completionArray)
// fs.writeFileSync(ROOT_DIR + '/completionArray.json', JSON.stringify(completionArray))

sys.print('Done!')

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

function addMissingStuff(){
	// currentWindow
	// currentTab
	// currentTabGroup
}
