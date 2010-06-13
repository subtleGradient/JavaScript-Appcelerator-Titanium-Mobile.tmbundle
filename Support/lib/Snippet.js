/*
---
name : Snippet
description : Create TextMate / Espresso style snippets using a simple API!
version: 0.1

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : Snippet
...
*/

function Snippet(string){
	if (!(this instanceof Snippet)) return new Snippet(string);
	
	this.snippet = '';
	this.appendText(string || '');
	this.placeholderID = 0;
}

Snippet.prototype = {
	
	appendRaw: function(string){
		this.snippet += string;
		return this;
	},
	
	appendText: function(string){
		this.snippet += Snippet[this.insidePlaceholder ? 'escapePlaceholderValue' : 'escape'](string);
		return this;
	},
	
	addPlaceholder: function(value, escape){
		this.appendPlaceholder(++ this.placeholderID, value, escape);
		return this;
	},
	
	addLast: function(value, escape){
		this.appendPlaceholder(0, value, escape);
		return this;
	},
	
	appendPlaceholder: function(key, value, escape){
		if (typeof escape === 'undefined') escape = true;
		if (!value) value = '';
		if (escape) value = Snippet.escapePlaceholderValue(value);
		this.snippet += "${"+ key +":"+ value +"}";
		return this;
	},
	
	begin: function(key){
		if (key == null) key = ++ this.placeholderID;
		this.snippet += "${"+ key +":";
		this.insidePlaceholder = true;
		return this;
	},
	
	end: function(){
		this.snippet += "}";
		this.insidePlaceholder = false;
		return this;
	},
	
	toString: function(){
		return this.snippet;
	},
	
	toJSON: function(){
		return this.toString();
	}
	
};

Snippet.escape = function(string){
	return (''+string).replace(/(?=[$`\\])/,'\\');
}

Snippet.escapePlaceholderValue = function(string){
	return (''+string).replace(/(?=[$`\\}])/,'\\');
}


if (typeof exports == 'undefined') var exports = {};
exports.Snippet = Snippet;

