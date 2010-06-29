/*
---
name : string
description : string extensions

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : 
- String.prototype.ljust
- String.prototype.multiply
...
*/

// http://code.google.com/p/zaapaas/source/browse/trunk/reform/util.js
// util.js - utility functions
//
// Copyright (C) 2009 Mikey K. <m.barren@gmail.com>

////////////////////////////////////////////////////////////////////////
// Various Prototype Extensions
////////////////////////////////////////////////////////////////////////

if (!String.prototype.ljust)
	String.prototype.ljust = function(len, chr){
	if (len > this.length)
		return this + (chr ? chr : " ").multiply(len - this.length);
	else
		return ''+this;
};

if (!String.prototype.rjust)
	String.prototype.rjust = function(len, chr){
	if (len > this.length)
		return (chr ? chr : " ").multiply(len - this.length) + this;
	else
		return ''+this;
};

// Copyright 2010 Thomas Aylott; MIT License
if (!String.prototype.cjust)
	String.prototype.cjust = function(length, chr){
	if (!chr) chr = " ";
	if (length > this.length){
		var padding = chr.multiply(length / 2 - this.length);
		return (padding + this + padding).ljust(length,chr);
	}
	else return ''+this;
};

////////////////////////////////////////////////////////////////////////
// Kris Kowal
// http://blog.stevenlevithan.com/archives/fast-string-multiply
////////////////////////////////////////////////////////////////////////

if (!String.prototype.multiply)
	String.prototype.multiply = function(num){
	num = Math.round(num);
	var str = this;
	var acc = [];
	for (var i = 0; (1 << i) <= num; i++) {
		if ((1 << i) & num)
			acc.push(str);
		str += str;
	}
	return acc.join("");
}

//  --

if (typeof console != 'undefined' && console.assert) {
	
	console.assert(".".multiply(3) === "...", ".".multiply(3));
	console.assert(".".multiply(1.5) === "..", ".".multiply(1.5));
	
	console.assert("1".ljust(1) === "1", "-1".ljust(1));
	
	console.assert("1".ljust(3) === "1  ", "1".ljust(3));
	console.assert("1".rjust(3) === "  1", "1".rjust(3));
	console.assert("1".cjust(3) === " 1 ", "1".cjust(3));
	
	console.assert("1".ljust(3,'.') === "1..", "1".ljust(3,'.'));
	console.assert("1".rjust(3,'.') === "..1", "1".rjust(3,'.'));
	console.assert("1".cjust(3,'.') === ".1.", "1".cjust(3,'.'));
	
	console.assert("2".ljust(4,'.') === "2...", "2".ljust(4,'.'));
	console.assert("2".rjust(4,'.') === "...2", "2".rjust(4,'.'));
	console.assert("2".cjust(4,'.') === ".2..", "2".cjust(4,'.'));
	
	console.assert("1".ljust(4) === "1   ", "1".ljust(4));
	console.assert("1".rjust(4) === "   1", "1".rjust(4));
	console.assert("1".cjust(4) === " 1  ", "1".cjust(4));
	
	console.assert("1".ljust(16)==="1               ","1".ljust(16));
	console.assert("1".rjust(16)==="               1","1".rjust(16));
	console.assert("1".cjust(16)==="       1        ","1".cjust(16));
}

