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

function push(it){ this[it] = true }

var completions = {};
// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

/*
curl -s 'http://developer.appcelerator.com/apidoc/mobile/1.5.1/api.json' > "$(dirname "$TM_FILEPATH")/api.json"
*/

var API = JSON.parse(fs.readFileSync(ROOT_DIR + '/api.json'));

for (var namespace in API){
	if (!hasOwnProperty.call(API, namespace)) continue;
	
	push.call(completions, namespace)
	push.call(completions, namespace.replace('tanium',''))
	
	for (var i = 0; i < API[namespace].methods.length; ++i){
		push.call(completions, API[namespace].methods[i].name)
		// push.call(completions, namespace + '.' + API[namespace].methods[i].name)
		// push.call(completions, namespace.replace('tanium','') + '.' + API[namespace].methods[i].name)
		
		push.call(completions, API[namespace].methods[i].name+'()')
		push.call(completions, namespace + '.' + API[namespace].methods[i].name+'()')
		push.call(completions, namespace.replace('tanium','') + '.' + API[namespace].methods[i].name+'()')
	}
	
	for (var i = 0; i < API[namespace].properties.length; ++i){
		push.call(completions, API[namespace].properties[i].name)
		push.call(completions, namespace + '.' + API[namespace].properties[i].name)
		push.call(completions, namespace.replace('tanium','') + '.' + API[namespace].properties[i].name)
	}
}
sys.puts(( '<string>' + Object.keys(completions).sort() .join('</string>\n<string>') + '</string>' ))
// fs.writeFileSync(ROOT_DIR + '/completions.json', JSON.stringify(completions))

// sys.print('Done!')

