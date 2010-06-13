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

var Suggestion = require('Suggestion').Suggestion;

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

Suggestion.completions.tool_tip_prefix = require('fs').readFileSync(ROOT_DIR + '/tool_tip.template.html');

var API = JSON.parse(fs.readFileSync(ROOT_DIR + '/api.json'));

for (var namespace in API){
	if (!hasOwnProperty.call(API, namespace)) continue;
	
	Suggestion.fromAPI(API[namespace], namespace, API);
	Suggestion.fromAPI(API[namespace], namespace.replace(/^Titanium/,'Ti'), API);
}

fs.writeFileSync(ROOT_DIR + '/completions.json', JSON.stringify(Suggestion.completions))

sys.print('Done!')

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
